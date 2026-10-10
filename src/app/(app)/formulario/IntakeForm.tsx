"use client";
import { Fragment, useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { OTHER_PREFIX, type Question } from "@/lib/forms";
import { saveIntake } from "./actions";

export type Acolhido = { id: string; label: string; followup?: Record<string, { value: string }> | null };

function Field({ q, initial = "" }: { q: Question; initial?: string }) {
  const isOther = q.type === "radio_other" && initial.startsWith(OTHER_PREFIX);
  const [choice, setChoice] = useState(isOther ? "__outro__" : initial);
  const name = q.key;
  const picked = q.type === "checkbox" ? initial.split("; ") : [];

  if (q.type === "textarea")
    return <textarea name={name} required={q.required} rows={5} defaultValue={initial} />;
  if (q.type === "date")
    return <input name={name} type="date" required={q.required} defaultValue={initial} />;
  if (q.type === "select")
    return (
      <select name={name} required={q.required} defaultValue={initial}>
        <option value="" disabled>Selecione...</option>
        {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  if (q.type === "checkbox")
    return (
      <div className="chips">
        {q.options.map((o) => (
          <label key={o} className="chip">
            <input type="checkbox" name={name} value={o} defaultChecked={picked.includes(o)} />
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
            <input type="radio" name={name} value={o} required={q.required} defaultChecked={choice === o} onChange={() => setChoice(o)} />
            <span>{o}</span>
          </label>
        ))}
        {q.type === "radio_other" && (
          <>
            <label className="chip">
              <input type="radio" name={name} value="__outro__" required={q.required} defaultChecked={choice === "__outro__"} onChange={() => setChoice("__outro__")} />
              <span>Outro</span>
            </label>
            {choice === "__outro__" && (
              <input name={`${name}__outro`} placeholder="Qual?" style={{ flexBasis: "100%" }} defaultValue={isOther ? initial.slice(OTHER_PREFIX.length) : ""} autoFocus />
            )}
          </>
        )}
      </div>
    );
  return <input name={name} type="text" required={q.required} defaultValue={initial} />;
}

export function IntakeForm({
  formKey, questions, acolhidos, selected,
}: {
  formKey: string;
  questions: Question[];
  acolhidos?: Acolhido[]; // só no acompanhamento
  selected?: string;
}) {
  const [msg, action, pending] = useActionState(saveIntake, null);
  const [sel, setSel] = useState(selected ?? "");
  const current = acolhidos?.find((a) => a.id === sel);

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
          <div className="help">O acompanhamento é salvo na mesma ficha do cadastro inicial. Se já houver um, ele abre para edição.</div>
          <select name="record_id" required value={sel} onChange={(e) => setSel(e.target.value)}>
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
              <Field key={`${sel}-${q.id}`} q={q} initial={formKey === "acompanhamento" ? current?.followup?.[q.key]?.value ?? "" : ""} />
            </div>
          </Fragment>
        );
      })}
      {msg && msg !== "ok" && <p className="error">{msg}</p>}
      <button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
    </form>
  );
}
