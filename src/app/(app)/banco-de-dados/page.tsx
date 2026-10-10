import Link from "next/link";
import { Database, Search } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { RecordList, type Item } from "./RecordList";

export default async function BancoDeDadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireMember();
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase
    .from("intake_records").select("id, answers, followup")
    .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
  const all = (data ?? []) as Item[];
  const { data: qs } = await supabase.from("form_questions").select("*")
    .eq("form_key", FORM_ACOMP).eq("active", true).order("position");

  const list = all.filter((c) =>
    !q || [c.answers.nomes?.value, c.answers.processo?.value, c.answers.unidade?.value]
      .some((v) => v?.toLowerCase().includes(q)));

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <h1 style={{ margin: "8px 0 0" }}>Banco de dados</h1>

      <form className="search">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, processo ou unidade" />
        <button aria-label="Buscar"><Search size={18} /></button>
      </form>

      {list.length === 0 ? (
        <div className="card empty">
          <div className="ico"><Database size={44} /></div>
          <h2>{q ? "Nada encontrado" : "Nenhum acolhido registrado"}</h2>
          <p>{q ? "Tente outro termo de busca." : <>Faça um <Link href="/cadastrar-pessoa">Formulário inicial</Link> para começar.</>}</p>
        </div>
      ) : (
        <RecordList items={list} questions={(qs ?? []) as Question[]} />
      )}
    </div>
  );
}
