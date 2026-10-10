import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { IntakeForm, type Acolhido } from "./IntakeForm";

export default async function FormularioPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; acolhido?: string }>;
}) {
  const me = await requireMember();
  const sp = await searchParams;
  const acomp = sp.aba === "acompanhamento";
  const formKey = acomp ? FORM_ACOMP : FORM_KEY;

  const supabase = await createClient();
  const { questions, personal } = await loadQuestions(supabase, formKey, me.id, true);
  const first = (me.name || me.email).split(" ")[0];
  const professional = [me.name || me.email, me.registry].filter(Boolean).join(" - ");

  let acolhidos: Acolhido[] | undefined;
  let cadastroQuestions: Question[] = [];
  if (acomp) {
    cadastroQuestions = (await loadQuestions(supabase, FORM_KEY, me.id)).questions;
    const { data: recs } = await supabase
      .from("intake_records").select("id, answers, followup, created_at")
      .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
    acolhidos = (recs ?? []).map((r) => ({
      id: r.id as string,
      answers: r.answers as Acolhido["answers"],
      followup: r.followup as Acolhido["followup"],
    }));
  }

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: "8px 0 0" }}>{personal ? `Cadastro de ${first}` : "Cadastro modelo"}</h1>
          <span className={personal ? "badge" : "badge off"}>
            {personal ? "Perguntas personalizadas por você" : "Modelo padrão — editar cria o seu cadastro"}
          </span>
        </div>
        <Link href={`/formulario/editar?form=${formKey}`}>
          <button className="ghost"><Settings2 size={16} /> Editar perguntas</button>
        </Link>
      </div>

      <div className="tabs">
        <Link href="/formulario" className={!acomp ? "active" : ""}>Cadastro inicial</Link>
        <Link href="/formulario?aba=acompanhamento" className={acomp ? "active" : ""}>Acompanhamento</Link>
      </div>

      <p style={{ margin: 0, color: "var(--muted)" }}>
        {acomp
          ? "Acompanhamento e reavaliação da situação da criança, adolescente ou grupo de irmãos em medida de acolhimento. Fica salvo na mesma ficha do cadastro inicial."
          : "Cadastro inicial para acompanhamento de criança ou adolescente acolhido."}{" "}
        Campos com * são obrigatórios.
      </p>

      {acomp && acolhidos?.length === 0 ? (
        <div className="card empty">
          <h2>Nenhum acolhido cadastrado</h2>
          <p>Faça primeiro o <Link href="/formulario">Cadastro inicial</Link> para poder registrar acompanhamentos.</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card empty">Nenhuma pergunta cadastrada ainda.</div>
      ) : (
        <IntakeForm key={formKey} formKey={formKey} professional={professional} hasRegistry={!!me.registry} questions={questions} acolhidos={acolhidos} selected={sp.acolhido} cadastroQuestions={cadastroQuestions} />
      )}
    </div>
  );
}
