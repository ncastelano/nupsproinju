"use client";
import { Fragment, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Pencil, RotateCcw, Save, Upload, X } from "lucide-react";
import { replaceReportTemplate, resetReportEdits, saveReportEdits } from "@/app/(app)/processos/modelo/actions";

type Para = { i: number; original: string; text: string; edited: boolean };
type Data = {
  paragraphs: Para[];
  questions: { key: string; label: string }[];
  sources: Record<string, string>;
  canEdit: boolean;
};

// Modelo do relatório: mostra, edita o texto na própria tela e liga cada campo às perguntas do Cadastro inicial.
export function ModeloRelatorio({ canEdit = false }: { canEdit?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const focus = useRef<{ i: number; pos: number } | null>(null);
  const [upMsg, upAction, upPending] = useActionState(replaceReportTemplate, null);
  const [fname, setFname] = useState("");

  async function load() {
    try {
      const r = await fetch("/processos/modelo");
      if (!r.ok) throw new Error();
      setData(await r.json());
      setErr(null);
    } catch { setErr("Não foi possível carregar o modelo."); }
  }
  useEffect(() => { if (open && !data) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (upMsg?.startsWith("ok:")) { setFname(""); load(); router.refresh(); }
  }, [upMsg]); // eslint-disable-line react-hooks/exhaustive-deps

  // {{CAMPO}} / {{Q:chave}}  <->  [número. Pergunta]
  const maps = useMemo(() => {
    if (!data) return null;
    const label = new Map<string, string>(); // token -> texto mostrado
    const reverse = new Map<string, string>(); // texto mostrado -> token
    for (const q of data.questions) { label.set(`Q:${q.key}`, q.label); reverse.set(q.label, `{{Q:${q.key}}}`); }
    for (const [name, src] of Object.entries(data.sources)) { label.set(name, src); reverse.set(src, `{{${name}}}`); }
    return { label, reverse };
  }, [data]);

  const show = (t: string) => t.replace(/\{\{([A-Za-z0-9_:]+)\}\}/g, (_, n) => `[${maps?.label.get(n) ?? n}]`);
  const unshow = (t: string) => t.replace(/\[([^\]\n]+)\]/g, (m, l) => maps?.reverse.get(l) ?? m);

  function startEdit() {
    if (!data) return;
    setDraft(Object.fromEntries(data.paragraphs.map((p) => [p.i, show(p.text)])));
    setNote(null);
    setEditing(true);
  }

  async function save() {
    if (!data) return;
    setBusy(true);
    const changes: Record<string, string> = {};
    for (const p of data.paragraphs) {
      const tok = unshow(draft[p.i] ?? show(p.text));
      if (tok !== p.original) changes[String(p.i)] = tok;
    }
    const r = await saveReportEdits(changes);
    setBusy(false);
    if (r === "ok") { setEditing(false); setNote("Modelo salvo. Os próximos relatórios já saem assim."); await load(); router.refresh(); }
    else setNote(r);
  }

  async function reset() {
    if (!confirm("Voltar o modelo para o texto original?")) return;
    setBusy(true);
    const r = await resetReportEdits();
    setBusy(false);
    if (r === "ok") { setEditing(false); setNote("Modelo voltou ao original."); await load(); } else setNote(r);
  }

  function insert(i: number, label: string) {
    const cur = draft[i] ?? "";
    const pos = focus.current?.i === i ? focus.current.pos : cur.length;
    const tag = `[${label}]`;
    setDraft({ ...draft, [i]: cur.slice(0, pos) + tag + cur.slice(pos) });
  }

  const firstTitle = data?.paragraphs.find((p) => p.text.trim())?.i;
  const heading = (p: Para) => /^\d+(\.\d+)*\.?\s+[A-ZÀ-Ú]/.test(p.text.trim()) || p.i === firstTitle;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row">
        <button type="button" className="ghost small" onClick={() => { setOpen((o) => !o); setEditing(false); }}>
          {open ? <X size={14} /> : <FileText size={14} />} {open ? "Fechar modelo" : "Ver modelo do relatório"}
        </button>
        {open && data?.canEdit && !editing && (
          <button type="button" className="ghost small" onClick={startEdit}><Pencil size={14} /> Editar modelo</button>
        )}
        {open && (
          <a href="/processos/modelo?baixar=1">
            <button type="button" className="ghost small"><Download size={14} /> Baixar modelo (.docx)</button>
          </a>
        )}
      </div>

      {open && (
        <div className="card modelo">
          <div className="modelo-note">
            {editing
              ? "Edite os textos direto aqui. Os campos entre [colchetes] são preenchidos com a resposta da pergunta de mesmo número; para ligar outra pergunta, use “+ pergunta” na linha."
              : "É isto que sai automaticamente em cada processo. Os campos em destaque são preenchidos com as respostas do Cadastro inicial."}
          </div>
          {note && <p className="ok">{note}</p>}
          {err && <p className="error">{err}</p>}
          {!data && !err && <p style={{ color: "var(--muted)" }}>Carregando...</p>}

          {data && !editing && data.paragraphs.map((p) => (
            <p key={p.i} className={heading(p) ? "modelo-h" : "modelo-p"}>
              {p.text.split(/(\{\{[A-Za-z0-9_:]+\}\})/g).map((part, j) => {
                const m = part.match(/^\{\{([A-Za-z0-9_:]+)\}\}$/);
                if (!m) return <Fragment key={j}>{part}</Fragment>;
                return <span key={j} className="ph" title={maps?.label.get(m[1]) ?? ""}>{maps?.label.get(m[1]) ?? m[1]}</span>;
              })}
              {p.edited && <em className="edited-tag"> · editado</em>}
            </p>
          ))}

          {data && editing && (
            <div className="grid" style={{ gap: 8 }}>
              {data.paragraphs.map((p) => (
                <div key={p.i} className="para-edit">
                  <textarea
                    value={draft[p.i] ?? ""}
                    rows={Math.max(1, Math.ceil((draft[p.i] ?? "").length / 70) + ((draft[p.i] ?? "").split("\n").length - 1))}
                    onChange={(e) => setDraft({ ...draft, [p.i]: e.target.value })}
                    onSelect={(e) => { focus.current = { i: p.i, pos: e.currentTarget.selectionStart }; }}
                    onBlur={(e) => { focus.current = { i: p.i, pos: e.currentTarget.selectionStart }; }}
                  />
                  <select
                    value=""
                    aria-label="Inserir pergunta"
                    onChange={(e) => { if (e.target.value) insert(p.i, e.target.value); }}
                  >
                    <option value="">+ pergunta</option>
                    {data.questions.map((q) => <option key={q.key} value={q.label}>{q.label}</option>)}
                  </select>
                </div>
              ))}
              <div className="row">
                <button type="button" onClick={save} disabled={busy}><Save size={16} /> {busy ? "Salvando..." : "Salvar modelo"}</button>
                <button type="button" className="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancelar</button>
                <button type="button" className="danger" onClick={reset} disabled={busy}><RotateCcw size={16} /> Voltar ao original</button>
              </div>
            </div>
          )}

          {data?.canEdit && !editing && (
            <details className="modelo-edit">
              <summary>Prefere editar no Word? Enviar um modelo .docx</summary>
              <form action={upAction} className="grid" style={{ gap: 8, marginTop: 8 }}>
                <div className="row">
                  <label className="ghost small file-pick">
                    <Upload size={14} /> {fname || "Escolher .docx editado"}
                    <input name="file" type="file" accept=".docx" hidden onChange={(e) => setFname(e.target.files?.[0]?.name ?? "")} />
                  </label>
                  <button className="small" disabled={upPending || !fname}>{upPending ? "Enviando..." : "Substituir modelo"}</button>
                </div>
                {upMsg?.startsWith("ok:") && <p className="ok">{upMsg.slice(3)}</p>}
                {upMsg && !upMsg.startsWith("ok:") && <p className="error">{upMsg}</p>}
              </form>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
