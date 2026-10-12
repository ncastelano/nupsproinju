"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, FileInput, FileText, Mic, Save, Square, Trash2, X } from "lucide-react";
import type { AudioEntry } from "@/lib/records";
import { transcribeBlob } from "@/lib/transcribe";
import { deleteAudio, insertTranscript, saveAudio, saveTranscript } from "@/app/(app)/audio-actions";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// Áudios do relatório: gravar, ouvir depois, transcrever para texto (depois de gravado) e inserir no documento.
export function AudioPanel({
  recordId, doc, audios, canEdit,
}: { recordId: string; doc: string; audios: AudioEntry[]; canEdit: boolean; me?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<"idle" | "rec" | "review">("idle");
  const [secs, setSecs] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // progresso da transcrição
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0 = useRef(0);

  useEffect(() => { setCanRecord(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"); }, []);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function startRec() {
    setMsg(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      rec.onstop = () => {
        const b = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState("review");
        s.getTracks().forEach((t) => t.stop());
      };
      mr.current = rec;
      rec.start(1000);
      t0.current = Date.now();
      setSecs(0); setText("");
      timer.current = setInterval(() => setSecs((Date.now() - t0.current) / 1000), 500);
      setState("rec");
    } catch {
      setMsg({ ok: false, t: "Não foi possível usar o microfone. Permita o acesso no navegador e tente de novo." });
    }
  }

  function stopRec() {
    if (timer.current) clearInterval(timer.current);
    setSecs((Date.now() - t0.current) / 1000);
    mr.current?.stop();
  }

  function discard() {
    setUrl(null); setBlob(null); setText(""); setBusy(null); setState("idle");
  }

  async function transcribeNew() {
    if (!blob) return;
    setMsg(null);
    try {
      const out = await transcribeBlob(blob, setBusy);
      setText(out);
      if (!out) setMsg({ ok: false, t: "Não consegui entender a fala neste áudio. Você pode digitar o texto." });
    } catch {
      setMsg({ ok: false, t: "Não foi possível transcrever agora. Verifique a conexão e tente de novo, ou digite o texto." });
    }
    setBusy(null);
  }

  function save() {
    if (!blob) return;
    const fd = new FormData();
    fd.set("record_id", recordId);
    fd.set("doc", doc);
    fd.set("secs", String(Math.round(secs)));
    fd.set("transcript", text);
    fd.set("file", new File([blob], "audio", { type: blob.type || "audio/webm" }));
    start(async () => {
      const r = await saveAudio(fd);
      if (r === "ok") { discard(); setMsg({ ok: true, t: "Áudio salvo." }); router.refresh(); } else setMsg({ ok: false, t: r });
    });
  }

  return (
    <section className="audio-panel">
      <div className="audio-top">
        <h4><AudioLines size={16} /> Áudios <span className="audio-count">{audios.length}</span></h4>
        {canEdit && state === "idle" && (
          <button type="button" onClick={startRec} disabled={!canRecord}><Mic size={16} /> Gravar áudio</button>
        )}
      </div>

      {state === "rec" && (
        <div className="audio-box">
          <span className="rec-dot" /> <span>Gravando…</span> <strong>{fmt(secs)}</strong>
          <button type="button" className="danger" onClick={stopRec}><Square size={16} /> Parar</button>
        </div>
      )}

      {state === "review" && url && (
        <div className="audio-box col">
          <audio controls src={url} />
          <div className="audio-actions">
            <button type="button" className="ghost" disabled={!!busy || pending} onClick={transcribeNew}><FileText size={16} /> Transcrever</button>
            <button type="button" disabled={!!busy || pending} onClick={save}><Save size={16} /> {pending ? "Salvando..." : "Salvar áudio"}</button>
            <button type="button" className="ghost" disabled={!!busy || pending} onClick={discard}><X size={16} /> Descartar</button>
          </div>
          {busy && <span className="audio-progress">{busy}</span>}
          {(text || !busy) && (
            <label className="field">
              <span>Texto do áudio (você pode corrigir ou digitar)</span>
              <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Clique em Transcrever para gerar o texto." />
            </label>
          )}
        </div>
      )}

      {msg && <span className={msg.ok ? "doc-ok" : "error"} style={{ fontSize: 13.5 }}>{msg.t}</span>}

      {audios.length === 0 && state === "idle" ? (
        <p className="audio-empty">Nenhum áudio neste relatório ainda.</p>
      ) : (
        <div className="audio-list">
          {audios.map((a) => <AudioItem key={a.id} a={a} recordId={recordId} canEdit={canEdit} onChange={() => router.refresh()} />)}
        </div>
      )}
    </section>
  );
}

function AudioItem({ a, recordId, canEdit, onChange }: { a: AudioEntry; recordId: string; canEdit: boolean; onChange: () => void }) {
  const [pending, start] = useTransition();
  const [t, setT] = useState(a.transcript);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<string>, ok?: string) => start(async () => {
    const r = await fn();
    setNote(r === "ok" ? ok ?? null : r);
    if (r === "ok") onChange();
  });

  async function transcribe() {
    setNote(null);
    try {
      const res = await fetch(`/audio/${recordId}/${a.id}`);
      const out = await transcribeBlob(await res.blob(), setBusy);
      setT(out); setOpen(true);
      if (out) { const r = await saveTranscript(recordId, a.id, out); if (r === "ok") { setNote("Transcrição salva."); onChange(); } else setNote(r); }
      else setNote("Não consegui entender a fala neste áudio.");
    } catch {
      setNote("Não foi possível transcrever agora. Verifique a conexão e tente de novo.");
    }
    setBusy(null);
  }

  return (
    <div className="audio-item">
      <div className="audio-head">
        <strong>{a.by_name || "—"}</strong>
        <span>{new Date(a.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {fmt(a.secs)}</span>
      </div>
      <audio controls preload="none" src={`/audio/${recordId}/${a.id}`} />
      <div className="audio-actions">
        {canEdit && <button type="button" className="ghost" disabled={!!busy || pending} onClick={transcribe}><FileText size={16} /> {t ? "Transcrever de novo" : "Transcrever"}</button>}
        {t && <button type="button" className="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Ocultar texto" : "Ver texto"}</button>}
        {canEdit && t.trim() && (
          <button
            type="button" className="ghost" disabled={pending || !!busy}
            onClick={() => run(async () => {
              if (t !== a.transcript) { const r = await saveTranscript(recordId, a.id, t); if (r !== "ok") return r; }
              return insertTranscript(recordId, a.id);
            }, "Texto inserido no fim do documento.")}
          ><FileInput size={16} /> Inserir no documento</button>
        )}
        {canEdit && <button type="button" className="danger" disabled={pending || !!busy} onClick={() => run(() => deleteAudio(recordId, a.id))}><Trash2 size={16} /> Apagar</button>}
      </div>
      {busy && <span className="audio-progress">{busy}</span>}
      {open && (
        <div className="grid" style={{ gap: 8 }}>
          <textarea rows={4} value={t} onChange={(e) => setT(e.target.value)} readOnly={!canEdit} />
          {canEdit && t !== a.transcript && (
            <div><button type="button" className="ghost" disabled={pending} onClick={() => run(() => saveTranscript(recordId, a.id, t), "Texto salvo.")}><Save size={16} /> Salvar texto</button></div>
          )}
        </div>
      )}
      {note && <span className="help" style={{ margin: 0 }}>{note}</span>}
    </div>
  );
}
