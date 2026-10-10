"use client";
import { Fragment, useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Question } from "@/lib/forms";
import { saveIntake } from "./actions";

export type Acolhido = { id: string; label: string };

function Field({ q }: { q: Question }) {
  const [choice, setChoice] = useState("");
  const name = q.key;

  if (q.type === "textarea")
    return <textarea name={name} required={q.required} rows={5} />;
  if (q.type === "date")
    return <input name={name} type="date" required={q.required} />;
  if (q.type === "select")
    return (
      <select name={name} required={q.required} defaultValue="">
        <option value="" disabled>Selecione...</option>
        {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  if (q.type === "checkbox")
    return (
      <div className="chips">
        {q.options.map((o) => (
          <label key={o} className="chip">
            <input type="checkbox" name={name} value={o} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    );
  if (q.type === "radio" || q.type === "radio_other")
    return (
      <div className="chips">
        {q.options.map((o) => (
          <label key={o} className="chip">
            <input type="radio" name={name} value={o} required={q.required} onChange={() => setChoice(o)} />
            <span>{o}</span>
          </label>
        ))}
        {q.type === "radio_other" && (
          <>
            <label className="chip">
              <input type="radio" name={name} value="__outro__" required={q.required} onChange={() => setChoice("__outro__")} />
              <span>Outro</span>
            </label>
            {choice === "__outro__" && (
              <input name={`${name}__outro`} placeholder="Qual?" style={{ flexBasis: "100%" }} autoFocus />
            )}
          </>
        )}
      </div>
    );
  return <input name={name} type="text" required={q.required} />;
}

export function IntakeForm({
  formKey, questions, acolhidos,
}: {
  formKey: string;
  questions: Question[];
  acolhidos?: Acolhido[]; // só no acompanhamento
}) {
  const [msg, action, pending] = useActionState(saveIntake, null);

  if (msg === "ok")
    return (
      <div className="card empty">
        <div className="ico"><CheckCircle2 size={44} /></div>
        <h2>Registro salvo</h2>
        <button onClick={() => location.reload()}>Fazer outro registro</button>
      </div>
    );

  let lastSection = "";
  return (
    <form action={action} className="grid" style={{ gap: 14 }}>
      <input type="hidden" name="form_key" value={formKey} />

      {acolhidos && (
        <div className="card q">
          <label className="q-label">Acolhido (do cadastro inicial)<span className="req"> *</span></label>
          <div className="help">O acompanhamento fica vinculado ao cadastro inicial da criança, adolescente ou grupo de irmãos.</div>
          <select name="parent_id" required defaultValue="">
            <option value="" disabled>Selecione...</option>
            {acolhidos.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
      )}

      {questions.map((q) => {
        const showSection = q.section && q.section !== lastSection;
        lastSection = q.section || lastSection;
        return (
          <Fragment key={q.id}>
            {showSection && <h2 className="section">{q.section}</h2>}
            <div className="card q">
              <label className="q-label">
                {q.label}{q.required && <span className="req"> *</span>}
              </label>
              {q.help && <div className="help">{q.help}</div>}
              <Field q={q} />
            </div>
          </Fragment>
        );
      })}
      {msg && msg !== "ok" && <p className="error">{msg}</p>}
      <button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
    </form>
  );
}
