import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { PrintButton } from "@/components/PrintButton";
import { ResumoA4, type Answers } from "@/components/ResumoA4";

export default async function ResumoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const supabase = await createClient();

  const { data: rec } = await supabase
    .from("intake_records").select("id, answers, followup")
    .eq("id", id).eq("form_key", FORM_KEY).maybeSingle();
  if (!rec) notFound();

  const { data: qs } = await supabase.from("form_questions").select("*")
    .eq("form_key", FORM_ACOMP).eq("active", true).order("position");

  return (
    <>
      <div className="no-print row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <Link href={`/banco-de-dados/${id}`} className="row"><ArrowLeft size={16} /> Voltar à ficha</Link>
        <PrintButton />
      </div>
      <ResumoA4 answers={rec.answers as Answers} followup={rec.followup as Answers | null} questions={(qs ?? []) as Question[]} />
    </>
  );
}
