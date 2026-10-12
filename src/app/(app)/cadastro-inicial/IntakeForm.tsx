"use client";
import { Fragment, useActionState, useState, type ReactNode } from "react";
import { CheckCircle2, Check } from "lucide-react";
import { RecordView, formatDate } from "@/components/RecordView";
import { ChoiceField } from "@/components/ChoiceField";
import { DateList } from "@/components/DateList";
import { OTHER_PREFIX, PROFESSIONAL_KEYS, type Question } from "@/lib/forms";
import { saveIntake } from "./actions";

type Answers = Record<string, { label: string; value: string }>;
export type Acolhido = { id: string; answers: Answers; followup: Answers | null };

export function Field({ q, initial = "" }: { q: Question; initial?: string }) {
  const name = q.key;

  if (q.type === "textarea")
    return <textarea name={name} required={q.required} rows={5} defaultValue={initial} />;
  if (q.type === "date")
    return <input name={name} type="date" required={q.required} defaultValue={initial} />;
  // data de nascimento: uma data por criança/adolescente, no mesmo formato de campo de data
  if (q.key === "nascimentos") return <DateList name={name} initial={initial} />;
  if (q.type === "select")
    return <ChoiceField name={name} title={q.label} options={q.options} initial={initial ? [initial] : []} />;
  if (q.type === "checkbox") {
    const picked = initial ? initial.split("; ") : [];
    const otherItem = picked.find((p) => p.startsWith(OTHER_PREFIX));
    const hasOther = q.options.includes("Outro");
    return (
      <ChoiceField
        name={name} title={q.label} multiple other={hasOther} options={q.options.filter((o) => o !== "Outro")}
        initial={[...picked.filter((p) => !p.startsWith(OTHER_PREFIX)), ...(otherItem !== undefined ? ["Outro"] : [])]}
        initialOther={otherItem?.slice(OTHER_PREFIX.length) ?? ""}
      />
    );
  }
  if (q.type === "radio" || q.type === "radio_other") {
    const isOther = q.type === "radio_other" && initial.startsWith(OTHER_PREFIX);
    return (
      <ChoiceField
        name={name} title={q.label} other={q.type === "radio_other"} singleOtherValue="__outro__" options={q.options}
        initial={isOther ? ["Outro"] : initial ? [initial] : []}
        initialOther={isOther ? initial.slice(OTHER_PREFIX.length) : ""}
      />
    );
  }
  return <input name={name} type="text" required={q.required} defaultValue={initial} />;
}

export function IntakeForm({
  formKey, questions, acolhidos, selected, cadastroQuestions = [], professional, hasRegistry, extra, owned = false,
  draftId = "", initialAnswers,
}: {
  draftId?: string;
  initialAnswers?: Record<string, string>;
  formKey: string;
  owned?: boolean;
  extra?: ReactNode;
  professional: string;
  hasRegistry: boolean;
  questions: Question[];
  cadastroQuestions?: Question[];
  acolhidos?: Acolhido[]; // só no acompanhamento
  selected?: string;
}) {
  const [msg, action, pending] = useActionState(saveIntake, null);
  const savedDraft = msg?.startsWith("draft:") ? msg.slice(6) : null;
  const currentDraft = savedDraft || draftId;
  const [sel, setSel] = useState(selected ?? "");
  const current = acolhidos?.find((a) => a.id === sel);

  const okId = msg?.startsWith("ok:") ? msg.slice(3) : null;
  if (msg === "ok" || okId)
    return (
      <div className="card empty">
        <div className="ico"><CheckCircle2 size={44} /></div>
        <h2>Registro salvo</h2>
        <p>O cadastro já aparece em <b>Relatórios</b>.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          {okId && <a href={`/cadastrados/${okId}/relatorio`}><button type="button">Baixar relatório (.docx)</button></a>}
          <a href="/processos"><button type="button" className="ghost">Ver em Relatórios</button></a>
          <button type="button" className="ghost" onClick={() => location.reload()}>Fazer outro cadastro</button>
        </div>
      </div>
    );

  let lastSection = "";
  return (
    <>
    <form id="intake-form" action={action} className="grid" style={{ gap: 14 }}>
      <input type="hidden" name="form_key" value={formKey} />
      {currentDraft && <input type="hidden" name="draft_id" value={currentDraft} />}

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

      {(!acolhidos || current) && questions.map((q, qi) => {
        const showSection = q.section && q.section !== lastSection;
        lastSection = q.section || lastSection;
        return (
          <Fragment key={`${q.id}-${qi}`}>
            {showSection && <h2 className="section">{q.section}</h2>}
            <div className="card q">
              <label className="q-label">
                {q.label}{q.required && <span className="req"> *</span>}
              </label>
              {q.help && <div className="help">{q.key === "nascimentos" ? "Em caso de grupo de irmãos, use “Adicionar outra data” e informe uma data para cada um, na mesma ordem em que os nomes foram informados acima." : q.help}</div>}
              {PROFESSIONAL_KEYS.includes(q.key) && q.type !== "checkbox" ? (
                <>
                  <div className="linked">{professional}</div>
                  <input type="hidden" name={q.key} value={professional} />
                  <div className="help">Preenchido automaticamente com a pessoa que está logada.</div>
                  {!hasRegistry && <p className="error">Informe o seu CRP ou CRESS no perfil (toque no seu nome) para assinar.</p>}
                </>
              ) : (
              <Field
                key={`${sel}-${q.id}`}
                q={PROFESSIONAL_KEYS.includes(q.key) ? { ...q, options: [...new Set([...q.options, professional])] } : q}
                initial={PROFESSIONAL_KEYS.includes(q.key) ? professional : formKey === "acompanhamento" ? current?.followup?.[q.key]?.value ?? "" : initialAnswers?.[q.key] ?? ""}
              />
              )}
              
            </div>
          </Fragment>
        );
      })}
    </form>

    {(!acolhidos || current) && extra}

    {msg && msg !== "ok" && !msg.startsWith("ok:") && !msg.startsWith("draft:") && <p className="error">{msg}</p>}
    {savedDraft && <p className="help" style={{ margin: 0 }}><span className="badge draft">Rascunho</span> salvo. Você pode continuar depois em Relatórios.</p>}
    <div className="row">
      {(!acolhidos || current) && (
        <button type="submit" form="intake-form" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
      )}
      {!acolhidos && formKey === "cadastro_inicial" && (
        <button type="submit" form="intake-form" name="intent" value="draft" formNoValidate className="ghost" disabled={pending}>
          Salvar rascunho
        </button>
      )}
    </div>
    </>
  );
}
