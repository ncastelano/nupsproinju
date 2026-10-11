"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileInput, Mic, Save, Square, Trash2 } from "lucide-react";
import type { AudioEntry } from "@/lib/records";
import { deleteAudio, insertTranscript, saveAudio, saveTranscript } from "@/app/(app)/audio-actions";

type Rec = { start: () => void; stop: () => void; lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// Áudios do relatório: gravar, ouvir depois, transcrever para texto e inserir a transcrição no documento.
export function AudioPanel({
  recordId, doc, audios, canEdit, me,
}: { recordId: string; doc: string; audios: AudioEntry[]; canEdit: boolean; me: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<"idle" | "rec" | "review">("idle");
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState(true);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const sr = useRef<Rec | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t0 = useRef(0);
  const finalText = useRef("");

  // suporte do navegador: só se sabe no cliente (evita diferença entre servidor e navegador)
  const [SR, setSR] = useState<(new () => Rec) | undefined>(undefined);
  const [canRecord, setCanRecord] = useState(false);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    setSR(() => w.SpeechRecognition ?? w.webkitSpeechRecognition);
    setCanRecord(!!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
  }, []);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    if (url) URL.revokeObjectURL(url);
  }, [url]);

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

      finalText.current = "";
      setText("");
      if (live && SR) {
        const r = new SR();
        r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
        r.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const piece = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText.current += (finalText.current ? " " : "") + piece.trim();
            else interim += piece;
          }
          setText((finalText.current + (interim ? " " + interim : "")).trim());
        };
        r.onerror = () => {};
        r.onend = () => { if (mr.current?.state === "recording") { try { r.start(); } catch {} } }; // o navegador corta sozinho: reinicia
        try { r.start(); sr.current = r; } catch {}
      }
      t0.current = Date.now();
      setSecs(0);
      timer.current = setInterval(() => setSecs((Date.now() - t0.current) / 1000), 500);
      setState("rec");
    } catch {
      setMsg({ ok: false, t: "Não foi possível usar o microfone. Permita o acesso no navegador e tente de novo." });
    }
  }

  function stopRec() {
    if (timer.current) clearInterval(timer.current);
    setSecs((Date.now() - t0.current) / 1000);
    try { sr.current?.stop(); } catch {}
    sr.current = null;
    mr.current?.stop();
  }

  function discard() {
    if (url) URL.revokeObjectURL(url);
    setUrl(null); setBlob(null); setText(""); setState("idle");
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
    <div className="grid" style={{ gap: 10 }}>
      <h4 className="act-title"><Mic size={14} style={{ verticalAlign: "-2px" }} /> Áudios ({audios.length})</h4>

      {canEdit && state === "idle" && (
        <div className="row" style={{ flexWrap: "wrap" }}>
          <button type="button" onClick={startRec} disabled={!canRecord}><Mic size={16} /> Gravar áudio</button>
          {SR ? (
            <label className="chip" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> <span>Transcrever para texto enquanto grava</span>
            </label>
          ) : (
            <span className="help" style={{ margin: 0 }}>A transcrição automática não está disponível neste navegador (use o Chrome ou o Safari); você pode digitar o texto depois.</span>
          )}
        </div>
      )}

      {state === "rec" && (
        <div className="audio-rec">
          <span className="rec-dot" /> Gravando… <strong>{fmt(secs)}</strong>
          <button type="button" className="danger" onClick={stopRec}><Square size={16} /> Parar</button>
          {live && SR && <div className="prev-text" style={{ flexBasis: "100%" }}>{text || "Fale para ver o texto aparecer aqui…"}</div>}
        </div>
      )}

      {state === "review" && url && (
        <div className="audio-rec" style={{ display: "grid" }}>
          <audio controls src={url} style={{ width: "100%" }} />
          <label className="field">
            <span>Transcrição (você pode corrigir ou digitar)</span>
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="row">
            <button type="button" disabled={pending} onClick={save}><Save size={16} /> {pending ? "Salvando..." : "Salvar áudio"}</button>
            <button type="button" className="ghost" disabled={pending} onClick={discard}>Descartar</button>
          </div>
        </div>
      )}

      {msg && <span className={msg.ok ? "doc-ok" : "error"} style={{ fontSize: 13.5 }}>{msg.t}</span>}

      {audios.length === 0 && state === "idle" && <span style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum áudio neste relatório ainda.</span>}
      {audios.map((a) => <AudioItem key={a.id} a={a} recordId={recordId} canEdit={canEdit} me={me} onChange={() => router.refresh()} />)}
    </div>
  );
}

function AudioItem({ a, recordId, canEdit, onChange }: { a: AudioEntry; recordId: string; canEdit: boolean; me: string; onChange: () => void }) {
  const [pending, start] = useTransition();
  const [t, setT] = useState(a.transcript);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<string>, ok?: string) => start(async () => {
    const r = await fn();
    setNote(r === "ok" ? ok ?? null : r);
    if (r === "ok") onChange();
  });
  return (
    <div className="audio-item">
      <div className="audio-head">
        <strong>{a.by_name || "—"}</strong>
        <span>{new Date(a.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} · {fmt(a.secs)}</span>
      </div>
      <audio controls preload="none" src={`/audio/${recordId}/${a.id}`} style={{ width: "100%" }} />
      <button type="button" className="ghost" onClick={() => setOpen((v) => !v)}>{open ? "Ocultar transcrição" : t ? "Ver transcrição" : "Adicionar transcrição"}</button>
      {open && (
        <div className="grid" style={{ gap: 8 }}>
          <textarea rows={4} value={t} onChange={(e) => setT(e.target.value)} readOnly={!canEdit} placeholder="Sem transcrição ainda." />
          {canEdit && (
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button type="button" className="ghost" disabled={pending || t === a.transcript} onClick={() => run(() => saveTranscript(recordId, a.id, t), "Transcrição salva.")}><Save size={16} /> Salvar texto</button>
              <button
                type="button" className="ghost" disabled={pending || !t.trim()}
                onClick={() => run(async () => {
                  if (t !== a.transcript) { const r = await saveTranscript(recordId, a.id, t); if (r !== "ok") return r; }
                  return insertTranscript(recordId, a.id);
                }, "Transcrição inserida no fim do documento.")}
              ><FileInput size={16} /> Inserir no documento</button>
            </div>
          )}
        </div>
      )}
      {canEdit && (
        <button type="button" className="danger" disabled={pending} onClick={() => run(() => deleteAudio(recordId, a.id))}><Trash2 size={16} /> Apagar áudio</button>
      )}
      {note && <span className="help" style={{ margin: 0 }}>{note}</span>}
    </div>
  );
}
