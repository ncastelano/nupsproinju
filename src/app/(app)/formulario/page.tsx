import Link from "next/link";
import { Settings2, ClipboardList } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEY, type Question } from "@/lib/forms";
import { IntakeForm } from "./IntakeForm";

export default async function FormularioPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const me = await requireMember();
  const aba = (await searchParams).aba === "acompanhamento" ? "acompanhamento" : "cadastro";

  const supabase = await createClient();
  const { data } = await supabase
    .from("form_questions").select("*")
    .eq("form_key", FORM_KEY).eq("active", true).order("position");
  const questions = (data ?? []) as Question[];

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: "8px 0 0" }}>Formulário</h1>
        {me.role === "admin" && aba === "cadastro" && (
          <Link href="/formulario/editar"><button className="ghost"><Settings2 size={16} /> Editar perguntas</button></Link>
        )}
      </div>

      <div className="tabs">
        <Link href="/formulario" className={aba === "cadastro" ? "active" : ""}>Cadastro inicial</Link>
        <Link href="/formulario?aba=acompanhamento" className={aba === "acompanhamento" ? "active" : ""}>Acompanhamento</Link>
      </div>

      {aba === "cadastro" ? (
        <>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Cadastro inicial para acompanhamento de criança ou adolescente acolhido. Campos com * são obrigatórios.
          </p>
          {questions.length === 0
            ? <div className="card empty">Nenhuma pergunta cadastrada ainda.</div>
            : <IntakeForm questions={questions} />}
        </>
      ) : (
        <div className="card empty">
          <div className="ico"><ClipboardList size={44} /></div>
          <h2>Acompanhamento em construção</h2>
          <p>Esta aba vem logo depois do cadastro inicial.</p>
        </div>
      )}
    </div>
  );
}
