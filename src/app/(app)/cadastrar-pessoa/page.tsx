import Link from "next/link";
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
  const { questions } = await loadQuestions(supabase, formKey, me.id, true);
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
      <div>
        <h1 style={{ margin: "8px 0 0" }}>{acomp ? "Novo acompanhamento" : "Cadastro inicial"}</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          {acomp
            ? "Escolha a criança ou adolescente e registre a reavaliação."
            : "Preenchido uma única vez por criança ou adolescente: é o marco inicial dos acompanhamentos e reavaliações."}{" "}
          Campos com <span className="req">*</span> são obrigatórios.
        </p>
      </div>
      {acomp && acolhidos?.length === 0 ? (
        <div className="card empty">
          <h2>Nenhum acolhido registrado</h2>
          <p>Faça primeiro o <Link href="/cadastrar-pessoa">Cadastro inicial</Link> para poder registrar acompanhamentos.</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card empty">Nenhuma pergunta cadastrada ainda.</div>
      ) : (
        <IntakeForm key={formKey} formKey={formKey} professional={professional} hasRegistry={!!me.registry} questions={questions}
          acolhidos={acolhidos} selected={sp.acolhido} cadastroQuestions={cadastroQuestions} />
      )}
    </div>
  );
}
