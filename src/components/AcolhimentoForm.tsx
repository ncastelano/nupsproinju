"use client";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";
import { createAcolhimento } from "@/app/(app)/actions";
import type { Professional } from "./ProfileForm";
import { CustomField, QuestionEditor, type FormQuestion } from "./QuestionEditor";

// Cada pergunta é um cartão próprio.
function Q({ children }: { children: ReactNode }) {
  return <div className="card qcard">{children}</div>;
}

export function AcolhimentoForm({
  professional, questions, isAdmin, onSaved, goProfile,
}: {
  professional: Professional; questions: FormQuestion[]; isAdmin: boolean;
  onSaved: () => void; goProfile: () => void;
}) {
  const [msg, action, pending] = useActionState(createAcolhimento, null);
  const [modality, setModality] = useState("");
  const [related, setRelated] = useState("");
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (msg === "ok") { ref.current?.reset(); setModality(""); setRelated(""); onSaved(); }
  }, [msg]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = !professional.registry;

  return (
    <div className="grid" style={{ gap: 14 }}>
      {isAdmin && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? <X size={16} /> : <Pencil size={16} />} {editing ? "Fechar edição" : "Editar perguntas"}
          </button>
        </div>
      )}
      {isAdmin && editing && <QuestionEditor questions={questions} />}

      <form ref={ref} action={action} className="grid" style={{ gap: 14 }}>
        <Q>
          <div className="field">
            <span>1. Profissional responsável pelo acompanhamento *</span>
            <div className="linked">
              {professional.name}{professional.registry ? ` - ${professional.registry}` : ""}
            </div>
            <small>Preenchido automaticamente com a pessoa que está logada.</small>
            {missing && (
              <div className="row">
                <span style={{ color: "var(--danger)" }}>Falta o seu CRP ou CRESS para assinar.</span>
                <button type="button" className="ghost" onClick={goProfile}>Informar no perfil</button>
              </div>
            )}
          </div>
        </Q>

        <Q><label className="field"><span>2. Número do processo *</span>
          <input name="process_number" required /></label></Q>

        <Q><label className="field"><span>3. Nome completo da(s) criança(s)/adolescente(s) *</span>
          <small>Em caso de grupo de irmãos, separar os nomes por ponto e vírgula (;).</small>
          <input name="children_names" required /></label></Q>

        <Q><label className="field"><span>4. Data de nascimento *</span>
          <small>Em caso de grupo de irmãos, registre as datas na mesma ordem dos nomes, separadas por ponto e vírgula (;).</small>
          <input name="children_birthdates" placeholder="dd/mm/aaaa" required /></label></Q>

        <Q><label className="field"><span>5. Nome da genitora</span><input name="mother_name" /></label></Q>
        <Q><label className="field"><span>5.1 Endereço da genitora</span>
          <small>Informar endereço completo, quando conhecido.</small><input name="mother_address" /></label></Q>
        <Q><label className="field"><span>5.2 Telefone/Contato da genitora</span>
          <small>Informar telefone e/ou WhatsApp, quando disponível.</small><input name="mother_contact" /></label></Q>

        <Q><label className="field"><span>6. Nome do genitor</span><input name="father_name" /></label></Q>
        <Q><label className="field"><span>6.1 Endereço do genitor</span>
          <small>Informar endereço completo, quando conhecido.</small><input name="father_address" /></label></Q>
        <Q><label className="field"><span>6.2 Telefone/Contato do genitor</span>
          <small>Informar telefone e/ou WhatsApp, quando disponível.</small><input name="father_contact" /></label></Q>

        <Q><label className="field"><span>7. Data do acolhimento *</span>
          <input name="reception_date" type="date" required /></label></Q>
        <Q><label className="field"><span>7.1 Conselho Tutelar responsável pelo acolhimento/encaminhamento</span>
          <small>Informar o Conselho Tutelar que realizou o acolhimento/encaminhamento, quando identificado.</small>
          <input name="tutelary_council" /></label></Q>

        <Q>
          <div className="field"><span>8. Modalidade atual de acolhimento *</span>
            <div className="choices">
              {["Acolhimento institucional", "Serviço de Acolhimento em Família Acolhedora", "Outro"].map((o) => (
                <label key={o} className="chip">
                  <input type="radio" name="modality" value={o} required onChange={() => setModality(o)} /> {o}
                </label>
              ))}
            </div>
            {modality === "Outro" && <input name="modality_other" placeholder="Qual?" required />}
          </div>
        </Q>

        <Q><label className="field"><span>9. Unidade/serviço de acolhimento *</span>
          <input name="unit_name" required /></label></Q>

        <Q>
          <div className="field"><span>Existem outros processos judiciais relacionados à criança/adolescente? *</span>
            <div className="choices">
              {[["sim", "Sim"], ["nao", "Não"], ["nao_verificado", "Não foi possível verificar"]].map(([v, l]) => (
                <label key={v} className="chip">
                  <input type="radio" name="has_related_processes" value={v} required onChange={() => setRelated(v)} /> {l}
                </label>
              ))}
            </div>
            {related === "sim" && (
              <label className="field"><span>Se sim, informe o(s) número(s) do(s) processo(s) relacionado(s)</span>
                <input name="related_processes" /></label>
            )}
          </div>
        </Q>

        <Q><label className="field"><span>10. Procedimentos realizados na avaliação inicial *</span>
          <small>Registrar a data, o procedimento realizado e a pessoa/instituição envolvida, uma linha para cada procedimento.</small>
          <textarea name="procedures" rows={6} required /></label></Q>

        {questions.map((q) => <Q key={q.id}><CustomField q={q} /></Q>)}

        <button disabled={pending || missing}>{pending ? "Salvando..." : "Salvar e gerar o texto"}</button>
        {msg && msg !== "ok" && <p className="error">{msg}</p>}
      </form>
    </div>
  );
}
