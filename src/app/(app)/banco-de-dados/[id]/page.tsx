import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardPen, FileText } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { RecordView, formatDate } from "@/components/RecordView";

type Answers = Record<string, { label: string; value: string }>;

function fmt(a: Answers) {
  const copy = { ...a };
  for (const k of ["data_acolhimento", "acomp_2"]) {
    if (copy[k]) copy[k] = { ...copy[k], value: formatDate(copy[k].value) };
  }
  return copy;
}

export default async function AcolhidoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const supabase = await createClient();

  const { data: rec } = await supabase
    .from("intake_records").select("id, answers, followup, followup_at")
    .eq("id", id).eq("form_key", FORM_KEY).maybeSingle();
  if (!rec) notFound();

  const { data: qs } = await supabase.from("form_questions").select("*").order("position");
  const questions = (qs ?? []) as Question[];
  const cadQs = questions.filter((q) => q.form_key === FORM_KEY);
  const acQs = questions.filter((q) => q.form_key === FORM_ACOMP);

  const a = rec.answers as Answers;
  const followup = rec.followup as Answers | null;

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href="/banco-de-dados" className="row"><ArrowLeft size={16} /> Voltar ao banco de dados</Link>

      <section className="hero">
        <h1 style={{ fontSize: 24 }}>{a.nomes?.value ?? "(sem nome)"}</h1>
        <p>Processo {a.processo?.value ?? "—"}{a.unidade?.value ? ` · ${a.unidade.value}` : ""}</p>
      </section>

      <div className="row">
        <Link href={`/banco-de-dados/${id}/resumo`}><button><FileText size={16} /> Resumo A4 / Imprimir</button></Link>
        <Link href={`/formulario?aba=acompanhamento&acolhido=${id}`}>
          <button className="ghost"><ClipboardPen size={16} /> {followup ? "Editar acompanhamento" : "Preencher acompanhamento"}</button>
        </Link>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Formulário inicial</h2>
        <RecordView answers={fmt(a)} questions={cadQs} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Acompanhamento</h2>
        {followup
          ? <RecordView answers={fmt(followup)} questions={acQs} />
          : <p style={{ color: "var(--muted)", margin: 0 }}>Ainda não preenchido.</p>}
      </div>
    </div>
  );
}
