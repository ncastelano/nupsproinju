"use client";
import { useActionState, useRef } from "react";
import { FileText, Upload } from "lucide-react";
import { replaceModel } from "@/app/(app)/modelos/actions";
import type { ModelInfo, ModelKind } from "@/lib/models";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Mostra o arquivo-base (.docx) em uso para este tipo de relatório e (para o administrador) permite trocá-lo.
export function ModelCard({
  kind, title, note, info, canEdit,
}: { kind: ModelKind; title: string; note: string; info: ModelInfo | null; canEdit: boolean }) {
  const [msg, action, pending] = useActionState(replaceModel, null);
  const form = useRef<HTMLFormElement>(null);
  const ok = msg?.startsWith("ok:") ? msg.slice(3) : null;
  return (
    <div className="card model-card">
      <div className="model-ico"><FileText size={22} /></div>
      <div className="model-body">
        <strong>{title}</strong>
        {info ? (
          <span className="model-file">
            {info.name}
            {info.size ? ` · ${kb(info.size)}` : ""}
            {info.updatedAt ? ` · em uso desde ${new Date(info.updatedAt).toLocaleDateString("pt-BR")}` : ""}
            {info.by ? ` · por ${info.by}` : ""}
          </span>
        ) : (
          <span className="model-file error" style={{ padding: "2px 8px" }}>Nenhum arquivo-base enviado.</span>
        )}
        <span className="help" style={{ margin: 0 }}>{note}</span>
        {ok && <span className="doc-ok">{ok}</span>}
        {msg && !ok && <span className="error">{msg}</span>}
      </div>
      <div className="model-actions">
        {info && <a href={`/modelos/${kind}/baixar`}><button type="button" className="ghost">Baixar modelo</button></a>}
        {canEdit && (
          <form ref={form} action={action}>
            <input type="hidden" name="kind" value={kind} />
            <label className="upload-btn">
              <Upload size={16} /> {pending ? "Enviando..." : "Trocar modelo"}
              <input
                type="file" name="file" accept=".docx" hidden disabled={pending}
                onChange={(e) => { if (e.target.files?.length) form.current?.requestSubmit(); }}
              />
            </label>
          </form>
        )}
      </div>
    </div>
  );
}
