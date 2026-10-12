"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Download, FileText, ListChecks, Loader2, Upload, X } from "lucide-react";
import { DocEditor } from "@/components/DocEditor";
import { getModelDoc, replaceModel } from "@/app/(app)/modelos/actions";
import type { DocData } from "@/lib/docxDoc";
import type { ModelInfo, ModelKind } from "@/lib/models";
import type { PreviewSection } from "@/lib/preview";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Dialog({ open, onClose, title, sub, actions, children }: {
  open: boolean; onClose: () => void; title: string; sub?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
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
  kind, reportTitle, note, info, sections, questionnaireNote,
}: {
  kind: ModelKind; reportTitle: string; note: string; info: ModelInfo | null;
  sections: PreviewSection[]; questionnaireNote: string;
}) {
  const [open, setOpen] = useState<"doc" | "q" | null>(null);
  const [data, setData] = useState<DocData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, action, pending] = useActionState(replaceModel, null);
  const form = useRef<HTMLFormElement>(null);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  useEffect(() => {
    if (open !== "doc") return;
    let live = true;
    setData(null); setErr(null);
    getModelDoc(kind).then((d) => { if (live) { if (d) setData(d); else setErr("Nenhum arquivo-base enviado."); } })
      .catch(() => live && setErr("Não foi possível abrir o modelo."));
    return () => { live = false; };
  }, [open, kind, msg]);

  const ok = msg?.startsWith("ok:") ? msg.slice(3) : null;

  return (
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
          <em>{total} perguntas · {sections.length} seções</em>
        </span>
      </button>

      <Dialog
        open={open === "doc"} onClose={() => setOpen(null)} title={reportTitle}
        sub={info ? `${info.name}${info.by ? ` · por ${info.by}` : ""}` : undefined}
        actions={(
          <>
            {info && <a href={`/modelos/${kind}/baixar`}><button type="button" className="ghost"><Download size={16} /> Baixar</button></a>}
            <form ref={form} action={action}>
              <input type="hidden" name="kind" value={kind} />
              <label className="upload-btn">
                {pending ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} {pending ? "Enviando..." : "Trocar modelo"}
                <input type="file" name="file" accept=".docx" hidden disabled={pending} onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }} />
              </label>
            </form>
          </>
        )}
      >
        <p className="help" style={{ margin: "0 0 10px" }}>{note} Somente leitura: para mudar, use “Trocar modelo”.</p>
        {ok && <p className="doc-ok">{ok}</p>}
        {msg && !ok && <p className="error">{msg}</p>}
        {err && <p className="error">{err}</p>}
        {!data && !err && <p><Loader2 size={16} className="spin" /> Abrindo o documento...</p>}
        {data && <DocEditor id="modelo" data={data} version="" canEdit={false} bare />}
      </Dialog>

      <Dialog open={open === "q"} onClose={() => setOpen(null)} title="Modelo do questionário" sub={`${total} perguntas em ${sections.length} seções`}>
        <p className="help" style={{ margin: "0 0 10px" }}>{questionnaireNote}</p>
        <div className="q-preview">
          {sections.map((s, si) => (
            <section key={si}>
              <h3 className="section">{s.title.toUpperCase()}</h3>
              {s.items.map((it, i) => (
                <div key={i} className="q-prev-item">
                  <div className="q-prev-label">{it.label}{it.required && <span className="req"> *</span>}</div>
                  <div className="q-prev-meta"><span className="chip">{it.kind}</span>{it.cond && <span className="q-prev-cond">{it.cond}</span>}</div>
                  {it.help && <div className="help">{it.help}</div>}
                  {it.options && (
                    <div className="q-prev-opts">{it.options.map((o) => <span key={o} className="chip">{o}</span>)}</div>
                  )}
                  {it.rows && <div className="q-prev-rows">Itens: {it.rows.join(" · ")}</div>}
                </div>
              ))}
            </section>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
