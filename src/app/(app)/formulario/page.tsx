import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
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
  const { data } = await supabase
    .from("form_questions").select("*")
    .eq("form_key", formKey).eq("active", true).order("position");
  const questions = (data ?? []) as Question[];

  let acolhidos: Acolhido[] | undefined;
  if (acomp) {
    const { data: recs } = await supabase
      .from("intake_records").select("id, answers, followup, created_at")
      .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
    acolhidos = (recs ?? []).map((r) => {
      const a = r.answers as Record<string, { value: string }>;
      return {
        id: r.id as string,
        label: `${a.nomes?.value ?? "(sem nome)"} — Proc. ${a.processo?.value ?? "?"}${r.followup ? " (acompanhamento preenchido)" : ""}`,
        followup: r.followup as Acolhido["followup"],
      };
    });
  }

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: "8px 0 0" }}>Formulário</h1>
        {me.role === "admin" && (
          <Link href={`/formulario/editar?form=${formKey}`}>
            <button className="ghost"><Settings2 size={16} /> Editar perguntas</button>
          </Link>
        )}
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
        <IntakeForm key={formKey} formKey={formKey} questions={questions} acolhidos={acolhidos} selected={sp.acolhido} />
      )}
    </div>
  );
}
