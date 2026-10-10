import Link from "next/link";
import { Database, Search, ChevronRight } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";

type Rec = {
  id: string; form_key: string; parent_id: string | null; created_at: string;
  answers: Record<string, { value: string }>;
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
    .from("intake_records").select("id, form_key, parent_id, created_at, answers")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as Rec[];

  const cadastros = all.filter((r) => r.form_key === FORM_KEY);
  const acomps = all.filter((r) => r.form_key === FORM_ACOMP);
  const byParent = new Map<string, Rec[]>();
  for (const a of acomps) if (a.parent_id) byParent.set(a.parent_id, [...(byParent.get(a.parent_id) ?? []), a]);

  const list = cadastros.filter((c) =>
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
        const filhos = (byParent.get(c.id) ?? []).sort((x, y) =>
          (y.answers.acomp_2?.value ?? "").localeCompare(x.answers.acomp_2?.value ?? ""));
        const ultima = filhos[0]?.answers.acomp_2?.value;
        return (
          <Link key={c.id} href={`/banco-de-dados/${c.id}`} className="tile">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <div>
                <h3>{a.nomes?.value ?? "(sem nome)"}</h3>
                <p>Proc. {a.processo?.value ?? "—"}{a.unidade?.value ? ` · ${a.unidade.value}` : ""}</p>
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="badge">{filhos.length} acompanhamento{filhos.length === 1 ? "" : "s"}</span>
                  {ultima && <span className="badge off">Última reavaliação: {formatDate(ultima)}</span>}
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
