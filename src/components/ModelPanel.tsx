"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, FileText, ListChecks, Loader2, Lock, Pencil, Upload, X } from "lucide-react";
import { DocEditor } from "@/components/DocEditor";
import { getModelDoc, replaceModel, saveModelDoc, saveQuestionnaire } from "@/app/(app)/modelos/actions";
import type { DocData } from "@/lib/docxDoc";
import type { ModelInfo, ModelKind } from "@/lib/models";
import { previewOf, type PreviewItem } from "@/lib/preview";
import type { FSection, FType } from "@/lib/fisc";
import { QuestionnaireEditor } from "@/components/QuestionnaireEditor";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Dialog({ open, onClose, title, sub, actions, children }: {
  open: boolean; onClose: () => void; title: string; sub?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const html = document.documentElement;
    if (open && !d.open) { d.showModal(); html.style.overflow = "hidden"; }
    if (!open && d.open) d.close();
    if (!open) html.style.overflow = "";
    return () => { html.style.overflow = ""; };
  }, [open]);
  return (
    <dialog ref={ref} className="model-dialog" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="model-dialog-head">
        <div style={{ minWidth: 0 }}>
          <strong>{title}</strong>
          {sub && <div className="model-file">{sub}</div>}
        </div>
        <div className="model-actions">{actions}</div>
        <button type="button" className="ghost icon" aria-label="Fechar" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="model-dialog-body">{open && children}</div>
    </dialog>
  );
}

// Modelos de cada aba (só administradores): o arquivo-base do relatório e o questionário. Clique para ver.
export function ModelPanel({
  kind, reportTitle, note, info, sections, questionnaireNote, formTitle, formDescription,
}: {
  kind: ModelKind; reportTitle: string; note: string; info: ModelInfo | null;
  sections: FSection[]; questionnaireNote: string; formTitle: string; formDescription?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"doc" | "q" | null>(null);
  const [edit, setEdit] = useState(false);
  const [data, setData] = useState<DocData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, action, pending] = useActionState(replaceModel, null);
  const form = useRef<HTMLFormElement>(null);
  const [editQ, setEditQ] = useState(false);
  const [draft, setDraft] = useState<FSection[]>(sections);
  const [qMsg, setQMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const preview = previewOf(sections);
  const total = preview.reduce((n, s) => n + s.items.length, 0);
  const types: FType[] = kind === "inicial" ? ["text", "textarea", "date", "select", "radio", "checkbox"] : ["text", "textarea", "number", "date", "select", "radio", "checkbox", "matrix"];
  useEffect(() => { if (open !== "q") { setEditQ(false); setQMsg(null); } }, [open]);
  async function saveQ() {
    setSaving(true);
    const r = await saveQuestionnaire(kind, draft);
    setSaving(false);
    setQMsg({ ok: r.ok, t: r.msg });
    if (r.ok) { router.refresh(); setEditQ(false); }
  }

  useEffect(() => {
    if (open !== "doc") return;
    let live = true;
    setData(null); setErr(null);
    getModelDoc(kind).then((d) => { if (live) { if (d) setData(d); else setErr("Nenhum arquivo-base enviado."); } })
      .catch(() => live && setErr("Não foi possível abrir o modelo."));
    return () => { live = false; };
  }, [open, kind, msg]);
  useEffect(() => { if (!open) setEdit(false); }, [open]);

  const ok = msg?.startsWith("ok:") ? msg.slice(3) : null;

  return (
    <section className="model-section">
      <div className="model-notice"><Lock size={14} /> Somente administradores podem visualizar e editar os modelos deste formulário.</div>
    <div className="model-row">
      <button type="button" className="model-chip" onClick={() => setOpen("doc")}>
        <span className="model-ico"><FileText size={20} /></span>
        <span className="model-text">
          <strong>{reportTitle}</strong>
          <em>{info ? `${info.name}${info.size ? ` · ${kb(info.size)}` : ""}${info.updatedAt ? ` · em uso desde ${new Date(info.updatedAt).toLocaleDateString("pt-BR")}` : ""}` : "Nenhum arquivo-base enviado"}</em>
        </span>
      </button>
      <button type="button" className="model-chip" onClick={() => setOpen("q")}>
        <span className="model-ico"><ListChecks size={20} /></span>
        <span className="model-text">
          <strong>Modelo do questionário</strong>
          <em>{total} perguntas · {preview.length} seções</em>
        </span>
      </button>

      <Dialog
        open={open === "doc"} onClose={() => setOpen(null)} title={reportTitle}
        sub={info ? `${info.name}${info.by ? ` · por ${info.by}` : ""}` : undefined}
        actions={(
          <>
            {info && !edit && <button type="button" onClick={() => setEdit(true)}><Pencil size={16} /> Editar</button>}
            {info && edit && <button type="button" className="ghost" onClick={() => setEdit(false)}>Concluir edição</button>}
            <form ref={form} action={action}>
              <input type="hidden" name="kind" value={kind} />
              <label className="upload-btn ghost-upload">
                {pending ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} {pending ? "Enviando..." : "Enviar modelo"}
                <input type="file" name="file" accept=".docx" hidden disabled={pending} onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
              </label>
            </form>
          </>
        )}
      >
        <p className="help" style={{ margin: "0 0 10px" }}>{note} {edit ? "Modo de edição: ajuste o texto e clique em Salvar. Mantenha os campos {{ASSIM}} entre chaves duplas." : "Somente leitura: use “Editar” para alterar ou “Enviar modelo” para trocar por um .docx."}</p>
        {ok && <p className="doc-ok">{ok}</p>}
        {msg && !ok && <p className="error">{msg}</p>}
        {err && <p className="error">{err}</p>}
        {!data && !err && <p><Loader2 size={16} className="spin" /> Abrindo o documento...</p>}
        {data && (
          <DocEditor
            key={edit ? "edit" : "view"} id="modelo" data={data} version="" canEdit={edit} bare={!edit}
            docRef={{ kind: "modelo" }} onSave={(p) => saveModelDoc(kind, p)} onSaved={() => router.refresh()}
          />
        )}
      </Dialog>

      <Dialog open={open === "q"} onClose={() => setOpen(null)} title="Modelo do questionário" sub={`${total} perguntas em ${preview.length} seções`}
        actions={editQ ? (
          <>
            <button type="button" disabled={saving} onClick={saveQ}>{saving ? "Salvando..." : "Salvar questionário"}</button>
            <button type="button" className="ghost" disabled={saving} onClick={() => { setEditQ(false); setDraft(sections); }}>Cancelar</button>
          </>
        ) : (
          <button type="button" onClick={() => { setDraft(sections); setEditQ(true); setQMsg(null); }}><Pencil size={16} /> Editar perguntas</button>
        )}
      >
        <p className="help" style={{ margin: "0 0 10px" }}>{questionnaireNote}</p>
        {qMsg && <p className={qMsg.ok ? "doc-ok" : "error"}>{qMsg.t}</p>}
        {editQ ? (
          <QuestionnaireEditor
            initial={sections} allowedTypes={types} onChange={setDraft}
            hint={kind === "fisc"
              ? "Mudanças aqui valem para os próximos preenchimentos; as perguntas novas entram sozinhas no relatório da fiscalização."
              : "Mudanças aqui valem para os próximos preenchimentos. Para uma pergunta nova aparecer no relatório, coloque o campo indicado em cada pergunta (por exemplo {{Q:chave}}) no modelo do relatório."}
          />
        ) : (
        <div className="gf">
          <div className="gf-card gf-title">
            <h2>{formTitle}</h2>
            {formDescription && <p>{formDescription}</p>}
            <small><span className="req">*</span> Indica uma pergunta obrigatória</small>
          </div>
          {preview.map((sec, si) => (
            <div key={si} className="gf-section">
              {preview.length > 1 && <div className="gf-tab">Seção {si + 1} de {preview.length}</div>}
              <div className="gf-card gf-sec-head"><h3>{sec.title}</h3></div>
              {sec.items.map((it, i) => <GfQuestion key={i} it={it} />)}
            </div>
          ))}
        </div>
        )}
      </Dialog>
    </div>
    </section>
  );
}

// Uma pergunta, no jeito do Google Forms (cartão branco, número e texto, campo de exemplo).
function GfQuestion({ it }: { it: PreviewItem }) {
  const opts = it.options ?? [];
  return (
    <div className="gf-card gf-q">
      <div className="gf-label">{it.label}{it.required && <span className="req"> *</span>}</div>
      {it.help && <div className="gf-help">{it.help}</div>}
      {it.cond && <div className="gf-cond">{it.cond}</div>}
      {it.type === "text" && <div className="gf-line short">Texto de resposta curta</div>}
      {it.type === "number" && <div className="gf-line short">Número</div>}
      {it.type === "textarea" && <div className="gf-line">Texto de resposta longa</div>}
      {it.type === "date" && <div className="gf-date">dd/mm/aaaa <CalendarDays size={16} /></div>}
      {it.type === "select" && (
        <ol className="gf-select">{opts.map((o) => <li key={o}>{o}</li>)}</ol>
      )}
      {(it.type === "radio" || it.type === "checkbox") && (
        <div className="gf-opts">
          {opts.map((o) => <div key={o} className="gf-opt"><span className={it.type === "radio" ? "gf-circle" : "gf-square"} />{o}</div>)}
          {it.other && <div className="gf-opt"><span className={it.type === "radio" ? "gf-circle" : "gf-square"} />Outro: <span className="gf-underline" /></div>}
        </div>
      )}
      {it.type === "matrix" && it.rows && (
        <div className="gf-grid-wrap">
          <table className="gf-grid">
            <thead><tr><th />{opts.map((o) => <th key={o}>{o}</th>)}</tr></thead>
            <tbody>
              {it.rows.map((r) => (
                <tr key={r}><th scope="row">{r}</th>{opts.map((o) => <td key={o}><span className="gf-circle" /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
