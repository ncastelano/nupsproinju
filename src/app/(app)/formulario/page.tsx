import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { CustomEditor } from "@/components/CustomEditor";
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
  const { questions, typeName, template, personal } = await loadQuestions(supabase, formKey, me.id, true);
  const owned = personal && template.owner_id === me.id;
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
        <span className="badge">Formulário em uso: {typeName}{personal && template.owner_id !== me.id ? ` · de ${template.owner_name}` : ""}</span>
        <Link href="/modelos-de-formularios" className="row" style={{ fontSize: 14 }}><LayoutTemplate size={14} /> Trocar formulário</Link>
      </div>
      {acomp && acolhidos?.length === 0 ? (
        <div className="card empty">
          <h2>Nenhum acolhido registrado</h2>
          <p>Faça primeiro o <Link href="/formulario">Formulário inicial</Link> para poder registrar acompanhamentos.</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="card empty">Nenhuma pergunta cadastrada ainda.</div>
      ) : (
        <IntakeForm key={formKey} formKey={formKey} professional={professional} hasRegistry={!!me.registry} questions={questions}
          owned={owned}
          extra={<CustomEditor formKey={formKey} activeName={typeName} owned={owned} suggestedName={`${typeName} · ${first}`} extras={questions.filter((q) => q.key.startsWith("x_"))} />} acolhidos={acolhidos} selected={sp.acolhido} cadastroQuestions={cadastroQuestions} />
      )}
    </div>
  );
}
