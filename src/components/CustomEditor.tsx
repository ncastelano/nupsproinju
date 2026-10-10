"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { TYPE_LABEL, type Question, type QuestionType } from "@/lib/forms";
import { addCustomQuestion, deleteCustomQuestion } from "@/app/(app)/formulario/custom-actions";

const NEEDS_OPTIONS: QuestionType[] = ["select", "radio", "radio_other", "checkbox"];
// Jeitos de responder, em linguagem simples.
const HOW: Partial<Record<QuestionType, string>> = {
  text: "Campo para escrever (resposta curta)",
  textarea: "Campo para escrever (resposta longa)",
  radio: "Escolher uma entre as opções",
  radio_other: "Escolher uma opção ou escrever outra",
  checkbox: "Marcar várias opções",
  date: "Data",
};

// "Editar": a pessoa acrescenta perguntas ao cadastro e dá um nome para o tipo de cadastro dela.
export function CustomEditor({
  formKey, activeName, owned, suggestedName, extras,
}: { formKey: string; activeName: string; owned: boolean; suggestedName: string; extras: Question[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuestionType>("text");
  const [msg, action, pending] = useActionState(addCustomQuestion, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (msg === "ok") { ref.current?.reset(); setType("text"); } }, [msg]);

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row">
        <button type="button" className="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={16} /> : <Plus size={16} />} {open ? "Fechar" : "Adicionar uma pergunta"}
        </button>
      </div>

      {open && (
        <div className="card grid" style={{ gap: 14 }}>
          <strong>Adicionar nova pergunta?</strong>

          {extras.map((q) => (
            <div key={q.key} className="qrow">
              <div>
                <strong>{q.label}{q.required ? " *" : ""}</strong>
                <div style={{ color: "var(--muted)", fontSize: 14 }}>
                  {TYPE_LABEL[q.type]}{q.options.length ? ` · ${q.options.join(" / ")}` : ""}
                </div>
              </div>
              <form action={deleteCustomQuestion} onSubmit={(e) => { if (!confirm("Apagar esta pergunta?")) e.preventDefault(); }}>
                <input type="hidden" name="form_key" value={formKey} />
                <input type="hidden" name="key" value={q.key} />
                <button className="danger" aria-label="Apagar pergunta"><Trash2 size={16} /></button>
              </form>
            </div>
          ))}

          <form ref={ref} action={action} className="grid" style={{ gap: 12 }}>
            <input type="hidden" name="form_key" value={formKey} />
            {owned ? (
              <small style={{ color: "var(--muted)" }}>
                Esta pergunta será acrescentada ao seu formulário “{activeName}”.
              </small>
            ) : (
              <label className="field"><span>Nome do seu novo formulário *</span>
                <input name="new_name" defaultValue={suggestedName} required />
                <small>
                  Você está usando “{activeName}”. Ao adicionar uma pergunta, isso vira um novo
                  formulário seu, que as outras pessoas também poderão ver e usar.
                </small>
              </label>
            )}
            <label className="field"><span>Pergunta *</span>
              <input name="label" required placeholder="Ex.: Situação escolar" /></label>
            <label className="field"><span>Frase de apoio (opcional)</span>
              <input name="help" /></label>
            <label className="field"><span>Como a pessoa responde?</span>
              <select name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                {(Object.keys(HOW) as QuestionType[]).map((t) => <option key={t} value={t}>{HOW[t]}</option>)}
              </select>
            </label>
            {NEEDS_OPTIONS.includes(type) && (
              <label className="field"><span>Opções de resposta (uma por linha)</span>
                <textarea name="options" rows={4} placeholder={"Sim\nNão\nNão se aplica"} />
                {type === "radio_other" && <small>A opção “Outro”, para escrever, é acrescentada automaticamente.</small>}
              </label>
            )}
            <label className="check"><input type="checkbox" name="required" /> Resposta obrigatória</label>
            <button disabled={pending}><Plus size={16} /> {pending ? "Salvando..." : "Adicionar pergunta"}</button>
            {msg === "ok" && <p className="ok">Pergunta adicionada. Ela já aparece no formulário.</p>}
            {msg && msg !== "ok" && <p className="error">{msg}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
