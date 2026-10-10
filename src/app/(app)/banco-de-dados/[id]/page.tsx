import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { RecordView, formatDate } from "@/components/RecordView";

type Rec = { id: string; created_at: string; answers: Record<string, { label: string; value: string }> };

export default async function AcolhidoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const supabase = await createClient();

  const { data: cad } = await supabase
    .from("intake_records").select("id, created_at, answers").eq("id", id).eq("form_key", FORM_KEY).maybeSingle();
  if (!cad) notFound();

  const [{ data: acs }, { data: qs }] = await Promise.all([
    supabase.from("intake_records").select("id, created_at, answers")
      .eq("parent_id", id).eq("form_key", FORM_ACOMP),
    supabase.from("form_questions").select("*").order("position"),
  ]);
  const questions = (qs ?? []) as Question[];
  const cadQs = questions.filter((q) => q.form_key === FORM_KEY);
  const acQs = questions.filter((q) => q.form_key === FORM_ACOMP);
  const acompanhamentos = ((acs ?? []) as Rec[]).sort((a, b) =>
    (b.answers.acomp_2?.value ?? b.created_at).localeCompare(a.answers.acomp_2?.value ?? a.created_at));

  const a = (cad as Rec).answers;
  const fmt = (r: Rec) => {
    const copy = { ...r.answers };
    if (copy.data_acolhimento) copy.data_acolhimento = { ...copy.data_acolhimento, value: formatDate(copy.data_acolhimento.value) };
    if (copy.acomp_2) copy.acomp_2 = { ...copy.acomp_2, value: formatDate(copy.acomp_2.value) };
    return copy;
  };

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href="/banco-de-dados" className="row"><ArrowLeft size={16} /> Voltar ao banco de dados</Link>

      <section className="hero">
        <h1 style={{ fontSize: 24 }}>{a.nomes?.value ?? "(sem nome)"}</h1>
        <p>Processo {a.processo?.value ?? "—"}{a.unidade?.value ? ` · ${a.unidade.value}` : ""}</p>
      </section>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cadastro inicial</h2>
        <RecordView answers={fmt(cad as Rec)} questions={cadQs} />
      </div>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Acompanhamentos ({acompanhamentos.length})</h2>
        <Link href={`/formulario?aba=acompanhamento&acolhido=${id}`}>
          <button><Plus size={16} /> Novo acompanhamento</button>
        </Link>
      </div>

      {acompanhamentos.length === 0 && (
        <div className="card empty">Nenhum acompanhamento registrado ainda.</div>
      )}
      {acompanhamentos.map((r, i) => (
        <details key={r.id} className="acomp" open={i === 0}>
          <summary>
            <span>Reavaliação de {formatDate(r.answers.acomp_2?.value) || "data não informada"}</span>
            <span className="badge">{acompanhamentos.length - i}º</span>
          </summary>
          <RecordView answers={fmt(r)} questions={acQs} />
        </details>
      ))}
    </div>
  );
}
