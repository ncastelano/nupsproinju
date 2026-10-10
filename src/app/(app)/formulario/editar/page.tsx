import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEYS, FORM_KEY, FORM_TITLE, TYPE_LABEL, type Question, type QuestionType } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { addQuestion, deleteQuestion, moveQuestion, updateQuestion } from "./actions";

function TypeSelect({ value }: { value: QuestionType }) {
  return (
    <select name="type" defaultValue={value}>
      {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
        <option key={t} value={t}>{TYPE_LABEL[t]}</option>
      ))}
    </select>
  );
}

export default async function EditarFormularioPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; modelo?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const modelo = sp.modelo === "1" && me.role === "admin";
  const f = sp.form ?? "";
  const formKey = (FORM_KEYS as readonly string[]).includes(f) ? f : FORM_KEY;
  const back = formKey === "acompanhamento" ? "/formulario?aba=acompanhamento" : "/formulario";
  const supabase = await createClient();
  let questions: Question[];
  let personal = false;
  if (modelo) {
    const { data } = await supabase.from("form_questions").select("*")
      .eq("form_key", formKey).is("owner_id", null).order("position");
    questions = (data ?? []) as Question[];
  } else {
    ({ questions, personal } = await loadQuestions(supabase, formKey, me.id));
  }
  const first = (me.name || me.email).split(" ")[0];
  const hidden = (q: Question) => (
    <>
      <input type="hidden" name="form_key" value={formKey} />
      <input type="hidden" name="key" value={q.key} />
      {modelo && <input type="hidden" name="modelo" value="1" />}
    </>
  );

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href={back} className="row"><ArrowLeft size={16} /> Voltar ao formulário</Link>
      <h1 style={{ margin: 0 }}>
        {modelo ? "Modelo" : personal ? `Cadastro de ${first}` : "Cadastro modelo"} · {FORM_TITLE[formKey]}
      </h1>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        {modelo
          ? "Você está editando o modelo que todo mundo recebe ao começar."
          : personal
            ? "Estas perguntas são só suas."
            : "Ao salvar a primeira alteração, o modelo é copiado e vira o seu cadastro."}{" "}
        Para opções de seleção, escreva uma por linha. Cadastros já salvos não mudam quando você edita uma pergunta.
      </p>
      {me.role === "admin" && (
        <Link href={modelo ? `/formulario/editar?form=${formKey}` : `/formulario/editar?form=${formKey}&modelo=1`} className="row">
          {modelo ? "Voltar ao meu cadastro" : "Editar o modelo padrão (admin)"}
        </Link>
      )}

      <form action={addQuestion} className="card grid">
        <input type="hidden" name="form_key" value={formKey} />
        {modelo && <input type="hidden" name="modelo" value="1" />}
        <strong><Plus size={16} style={{ verticalAlign: "-3px" }} /> Nova pergunta</strong>
        <input name="label" placeholder="Pergunta" required />
        <input name="help" placeholder="Texto de ajuda (opcional)" />
        <div className="row">
          <input name="section" placeholder="Seção (ex.: ACOLHIMENTO)" defaultValue="" />
          <TypeSelect value="text" />
        </div>
        <textarea name="options" rows={3} placeholder={"Opções (uma por linha), só para tipos de seleção\nSim\nNão"} />
        <label className="check"><input type="checkbox" name="required" /> Obrigatória</label>
        <button>Adicionar pergunta</button>
      </form>

      {questions.map((q, i) => (
        <div key={q.id} className="card grid" style={{ opacity: q.active ? 1 : 0.6 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="badge">{i + 1} · {q.section || "sem seção"}</span>
            <div className="row">
              <form action={moveQuestion}>
                {hidden(q)}<input type="hidden" name="dir" value="up" />
                <button className="ghost" aria-label="Subir" disabled={i === 0}><ArrowUp size={16} /></button>
              </form>
              <form action={moveQuestion}>
                {hidden(q)}<input type="hidden" name="dir" value="down" />
                <button className="ghost" aria-label="Descer" disabled={i === questions.length - 1}><ArrowDown size={16} /></button>
              </form>
            </div>
          </div>

          <form action={updateQuestion} className="grid">
            {hidden(q)}
            <input name="label" defaultValue={q.label} required />
            <input name="help" defaultValue={q.help} placeholder="Texto de ajuda (opcional)" />
            <div className="row">
              <input name="section" defaultValue={q.section} placeholder="Seção" />
              <TypeSelect value={q.type} />
            </div>
            <textarea name="options" rows={Math.min(Math.max(q.options.length, 2), 8)} defaultValue={q.options.join("\n")}
              placeholder="Opções (uma por linha), só para tipos de seleção" />
            <div className="row">
              <label className="check"><input type="checkbox" name="required" defaultChecked={q.required} /> Obrigatória</label>
              <label className="check"><input type="checkbox" name="active" defaultChecked={q.active} /> Visível no formulário</label>
              <button className="ghost">Salvar</button>
            </div>
          </form>

          <form action={deleteQuestion}>
            {hidden(q)}
            <button className="danger">Excluir pergunta</button>
          </form>
        </div>
      ))}
    </div>
  );
}
