"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { PROFESSIONAL_KEYS, type Question } from "@/lib/forms";
import { RecordView } from "@/components/RecordView";
import { Field } from "@/app/(app)/cadastrar-pessoa/IntakeForm";
import { saveRecordEdit, startEdit, stopEdit } from "@/app/(app)/cadastrados/records-actions";
import type { Ans, Scope } from "@/lib/records";

// Um bloco da ficha (formulário ou acompanhamento): lê e, se puder, edita ali mesmo.
export function RecordSection({
  recordId, scope, title, raw, view, questions, canEdit, emptyText,
}: {
  recordId: string; scope: Scope; title: string;
  raw: Ans | null;        // valores originais (para o editor)
  view: Ans | null;       // valores formatados (para leitura)
  questions: Question[];
  canEdit: boolean;
  emptyText: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [msg, action, pending] = useActionState(saveRecordEdit, null);
  const [busy, start] = useTransition();

  useEffect(() => {
    if (msg === "ok") { setEditing(false); router.refresh(); }
  }, [msg]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = () => start(async () => { await startEdit(recordId, scope); setEditing(true); router.refresh(); });
  const cancel = () => start(async () => { await stopEdit(recordId); setEditing(false); router.refresh(); });

  const editable = questions.filter((q) => !PROFESSIONAL_KEYS.includes(q.key));
  let last = "";

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {canEdit && !editing && (
          <button type="button" className="ghost" onClick={begin} disabled={busy}>
            <Pencil size={16} /> {raw ? "Editar" : "Preencher"}
          </button>
        )}
        {editing && (
          <button type="button" className="ghost" onClick={cancel} disabled={busy}><X size={16} /> Cancelar</button>
        )}
      </div>

      {!editing ? (
        <div style={{ marginTop: 12 }}>
          {view ? <RecordView answers={view} questions={questions} />
            : <p style={{ color: "var(--muted)", margin: 0 }}>{emptyText}</p>}
        </div>
      ) : (
        <form action={action} className="grid" style={{ gap: 12, marginTop: 12 }}>
          <input type="hidden" name="record_id" value={recordId} />
          <input type="hidden" name="scope" value={scope} />
          {editable.map((q, i) => {
            const head = q.section && q.section !== last ? q.section : null;
            last = q.section || last;
            return (
              <div key={`${q.key}-${i}`} className="grid" style={{ gap: 8 }}>
                {head && <h3 className="section" style={{ margin: "8px 0 0" }}>{head}</h3>}
                <div className="card q">
                  <label className="q-label">{q.label}{q.required && <span className="req"> *</span>}</label>
                  {q.help && <div className="help">{q.help}</div>}
                  <Field q={q} initial={raw?.[q.key]?.value ?? ""} />
                </div>
              </div>
            );
          })}
          {msg && msg !== "ok" && <p className="error">{msg}</p>}
          <div className="row">
            <button disabled={pending}>{pending ? "Salvando..." : "Salvar alterações"}</button>
            <button type="button" className="ghost" onClick={cancel} disabled={busy}>Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
