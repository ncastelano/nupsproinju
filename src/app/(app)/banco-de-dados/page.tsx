import Link from "next/link";
import { Database, Search, ChevronRight } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEY } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";

type Rec = {
  id: string;
  answers: Record<string, { value: string }>;
  followup: Record<string, { value: string }> | null;
};

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
  const all = (data ?? []) as Rec[];

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
          <h2>{q ? "Nada encontrado" : "Nenhum acolhido cadastrado"}</h2>
          <p>{q ? "Tente outro termo de busca." : <>Faça um <Link href="/formulario">Cadastro inicial</Link> para começar.</>}</p>
        </div>
      ) : list.map((c) => {
        const a = c.answers;
        const reav = c.followup?.acomp_2?.value;
        return (
          <Link key={c.id} href={`/banco-de-dados/${c.id}`} className="tile">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <div>
                <h3>{a.nomes?.value ?? "(sem nome)"}</h3>
                <p>Proc. {a.processo?.value ?? "—"}{a.unidade?.value ? ` · ${a.unidade.value}` : ""}</p>
                <div className="row" style={{ marginTop: 10 }}>
                  {c.followup
                    ? <span className="badge">Acompanhamento{reav ? ` · reavaliação ${formatDate(reav)}` : ""}</span>
                    : <span className="badge off">Sem acompanhamento</span>}
                </div>
              </div>
              <ChevronRight />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
