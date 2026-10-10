"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { TYPE_LABEL, type Question, type QuestionType } from "@/lib/forms";
import { addCustomQuestion, deleteCustomQuestion } from "@/app/(app)/formulario/custom-actions";

const NEEDS_OPTIONS: QuestionType[] = ["select", "radio", "radio_other", "checkbox"];

// "Editar": a pessoa acrescenta perguntas ao cadastro e dá um nome para o tipo de cadastro dela.
export function CustomEditor({
  formKey, typeName, extras,
}: { formKey: string; typeName: string; extras: Question[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<QuestionType>("text");
  const [msg, action, pending] = useActionState(addCustomQuestion, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (msg === "ok") { ref.current?.reset(); setType("text"); } }, [msg]);

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row">
        <button type="button" className="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={16} /> : <Pencil size={16} />} {open ? "Fechar edição" : "Editar"}
        </button>
        {typeName && <span className="badge">Tipo de cadastro: {typeName}</span>}
      </div>

      {open && (
        <div className="card grid" style={{ gap: 14 }}>
          <strong>Adicionar pergunta ao cadastro</strong>

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
            <label className="field"><span>Nome do tipo de cadastro *</span>
              <input name="type_name" defaultValue={typeName} placeholder="Ex.: Cadastro da Gessiane" required />
              <small>É o nome com que este tipo de cadastro fica salvo.</small>
            </label>
            <label className="field"><span>Pergunta *</span>
              <input name="label" required placeholder="Ex.: Situação escolar" /></label>
            <label className="field"><span>Texto de ajuda (opcional)</span>
              <input name="help" /></label>
            <label className="field"><span>Tipo de resposta</span>
              <select name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </label>
            {NEEDS_OPTIONS.includes(type) && (
              <label className="field"><span>Respostas prontas (uma por linha)</span>
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
