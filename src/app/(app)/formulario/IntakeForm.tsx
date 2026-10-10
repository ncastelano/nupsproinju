"use client";
import { Fragment, useActionState, useState, type ReactNode } from "react";
import { CheckCircle2, Check } from "lucide-react";
import { RecordView, formatDate } from "@/components/RecordView";
import { OTHER_PREFIX, PROFESSIONAL_KEYS, type Question } from "@/lib/forms";
import { QuestionEdit } from "@/components/QuestionEdit";
import { saveIntake } from "./actions";

type Answers = Record<string, { label: string; value: string }>;
export type Acolhido = { id: string; answers: Answers; followup: Answers | null };

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
  formKey, questions, acolhidos, selected, cadastroQuestions = [], professional, hasRegistry, extra,
}: {
  formKey: string;
  extra?: ReactNode;
  professional: string;
  hasRegistry: boolean;
  questions: Question[];
  cadastroQuestions?: Question[];
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
    <>
    <form id="intake-form" action={action} className="grid" style={{ gap: 14 }}>
      <input type="hidden" name="form_key" value={formKey} />

      {acolhidos && (
        <>
          <h2 className="section">ESCOLHA O ACOLHIDO</h2>
          <div className="acolhido-grid">
            {acolhidos.map((a) => {
              const checked = a.id === sel;
              return (
                <label key={a.id} className={`acolhido-card${checked ? " on" : ""}`}>
                  <input type="radio" name="record_id" value={a.id} required checked={checked}
                    onChange={() => setSel(a.id)} />
                  <div className="ac-top">
                    <strong>{a.answers.nomes?.value ?? "(sem nome)"}</strong>
                    {checked && <span className="ac-check"><Check size={16} /></span>}
                  </div>
                  <div className="ac-line">Proc. {a.answers.processo?.value ?? "—"}</div>
                  {a.answers.unidade?.value && <div className="ac-line">{a.answers.unidade.value}</div>}
                  {a.answers.data_acolhimento?.value && (
                    <div className="ac-line">Acolhido em {formatDate(a.answers.data_acolhimento.value)}</div>
                  )}
                  <span className={a.followup ? "badge" : "badge off"} style={{ marginTop: 8 }}>
                    {a.followup ? "Acompanhamento preenchido" : "Sem acompanhamento"}
                  </span>
                </label>
              );
            })}
          </div>

          {current ? (
            <details className="card" open>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                Formulário inicial de {current.answers.nomes?.value ?? "(sem nome)"}
              </summary>
              <div style={{ marginTop: 10 }}>
                <RecordView
                  answers={{
                    ...current.answers,
                    ...(current.answers.data_acolhimento && {
                      data_acolhimento: { ...current.answers.data_acolhimento, value: formatDate(current.answers.data_acolhimento.value) },
                    }),
                  }}
                  questions={cadastroQuestions}
                />
              </div>
            </details>
          ) : (
            <div className="card empty" style={{ padding: 20 }}>Selecione um acolhido acima para preencher o acompanhamento.</div>
          )}
        </>
      )}

      {(!acolhidos || current) && questions.map((q) => {
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
              {PROFESSIONAL_KEYS.includes(q.key) ? (
                <>
                  <div className="linked">{professional}</div>
                  <input type="hidden" name={q.key} value={professional} />
                  <div className="help">Preenchido automaticamente com a pessoa que está logada.</div>
                  {!hasRegistry && <p className="error">Informe o seu CRP ou CRESS no perfil (toque no seu nome) para assinar.</p>}
                </>
              ) : (
              <Field key={`${sel}-${q.id}`} q={q} initial={formKey === "acompanhamento" ? current?.followup?.[q.key]?.value ?? "" : ""} />
              )}
              {!PROFESSIONAL_KEYS.includes(q.key) && <QuestionEdit key={`${q.key}-${q.label}-${q.help}`} q={q} formKey={formKey} />}
            </div>
          </Fragment>
        );
      })}
    </form>

    {(!acolhidos || current) && extra}

    {msg && msg !== "ok" && <p className="error">{msg}</p>}
    <div className="row">
      {(!acolhidos || current) && (
        <button type="submit" form="intake-form" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
      )}
    </div>
    </>
  );
}
