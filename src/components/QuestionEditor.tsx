"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { createQuestion, deleteQuestion } from "@/app/(app)/actions";

export type FormQuestion = {
  id: string; label: string; help: string;
  kind: "text" | "textarea" | "date" | "choice" | "choice_other";
  options: string[]; required: boolean;
};

const KIND_LABEL: Record<FormQuestion["kind"], string> = {
  text: "Resposta curta",
  textarea: "Resposta longa",
  date: "Data",
  choice: "Escolher uma resposta pronta",
  choice_other: "Respostas prontas ou escrever outra",
};

export function QuestionEditor({ questions }: { questions: FormQuestion[] }) {
  const [msg, action, pending] = useActionState(createQuestion, null);
  const [kind, setKind] = useState("text");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (msg === "ok") { ref.current?.reset(); setKind("text"); } }, [msg]);

  const hasOptions = kind === "choice" || kind === "choice_other";

  return (
    <section className="card grid" style={{ gap: 14 }}>
      <div>
        <h3 style={{ margin: 0 }}>Editar perguntas</h3>
        <span style={{ color: "var(--muted)" }}>
          As perguntas novas entram no fim do formulário, depois da 10. As originais não mudam.
        </span>
      </div>

      {questions.map((q) => (
        <div key={q.id} className="qrow">
          <div>
            <strong>{q.label}{q.required ? " *" : ""}</strong>
            <div style={{ color: "var(--muted)", fontSize: 14 }}>
              {KIND_LABEL[q.kind]}{q.options.length ? ` · ${q.options.join(" / ")}` : ""}
            </div>
          </div>
          <form action={deleteQuestion} onSubmit={(e) => { if (!confirm("Apagar esta pergunta?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={q.id} />
            <button className="danger" aria-label="Apagar pergunta"><Trash2 size={16} /></button>
          </form>
        </div>
      ))}

      <form ref={ref} action={action} className="grid" style={{ gap: 12 }}>
        <strong>Adicionar pergunta</strong>
        <label className="field"><span>Pergunta</span><input name="label" required placeholder="Ex.: Qual a situação escolar?" /></label>
        <label className="field"><span>Orientação (opcional)</span><input name="help" placeholder="Texto de ajuda abaixo da pergunta" /></label>
        <label className="field"><span>Tipo de resposta</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {hasOptions && (
          <label className="field"><span>Respostas prontas (uma por linha)</span>
            <textarea name="options" rows={4} placeholder={"Frequenta a escola\nNão frequenta\nSem informação"} />
          </label>
        )}
        <label className="check"><input type="checkbox" name="required" /> Resposta obrigatória</label>
        <button disabled={pending}>{pending ? "Salvando..." : "Adicionar pergunta"}</button>
        {msg === "ok" && <p className="ok">Pergunta adicionada.</p>}
        {msg && msg !== "ok" && <p className="error">{msg}</p>}
      </form>
    </section>
  );
}

// Campo de uma pergunta extra, dentro do formulário.
export function CustomField({ q }: { q: FormQuestion }) {
  const name = `q_${q.id}`;
  const [pick, setPick] = useState("");
  const star = q.required ? " *" : "";

  if (q.kind === "choice" || q.kind === "choice_other") {
    return (
      <div className="field">
        <span>{q.label}{star}</span>
        {q.help && <small>{q.help}</small>}
        <div className="choices">
          {q.options.map((o) => (
            <label key={o} className="chip">
              <input type="radio" name={name} value={o} required={q.required} onChange={() => setPick(o)} /> {o}
            </label>
          ))}
          {q.kind === "choice_other" && (
            <label className="chip">
              <input type="radio" name={name} value="__other" required={q.required} onChange={() => setPick("__other")} /> Outro
            </label>
          )}
        </div>
        {pick === "__other" && <input name={`${name}_other`} placeholder="Escreva a resposta" required />}
      </div>
    );
  }
  return (
    <label className="field">
      <span>{q.label}{star}</span>
      {q.help && <small>{q.help}</small>}
      {q.kind === "textarea" ? (
        <textarea name={name} rows={4} required={q.required} />
      ) : (
        <input name={name} type={q.kind === "date" ? "date" : "text"} required={q.required} />
      )}
    </label>
  );
}
