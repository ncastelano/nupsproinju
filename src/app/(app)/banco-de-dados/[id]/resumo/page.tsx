import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, type Question } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";
import { PrintButton } from "@/components/PrintButton";

type Answers = Record<string, { label: string; value: string }>;

const val = (a: Answers | null | undefined, k: string) => a?.[k]?.value ?? "";

export default async function ResumoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const supabase = await createClient();

  const { data: rec } = await supabase
    .from("intake_records").select("id, answers, followup")
    .eq("id", id).eq("form_key", FORM_KEY).maybeSingle();
  if (!rec) notFound();
  const a = rec.answers as Answers;
  const f = rec.followup as Answers | null;

  const { data: qs } = await supabase.from("form_questions").select("*")
    .eq("form_key", FORM_ACOMP).eq("active", true).order("position");
  const acQs = (qs ?? []) as Question[];

  // seções do acompanhamento, na ordem, sem a identificação (já está no topo da folha)
  const sections: { title: string; items: { label: string; value: string }[] }[] = [];
  for (const q of acQs) {
    if (["acomp_1", "acomp_2"].includes(q.key)) continue;
    const ans = f?.[q.key];
    if (!ans) continue;
    let s = sections.find((x) => x.title === q.section);
    if (!s) sections.push((s = { title: q.section, items: [] }));
    s.items.push({ label: q.label, value: ans.value });
  }

  return (
    <>
      <div className="no-print row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <Link href={`/banco-de-dados/${id}`} className="row"><ArrowLeft size={16} /> Voltar à ficha</Link>
        <PrintButton />
      </div>

      <article className="a4">
        <header className="a4-head">
          <div>
            <div className="a4-org">Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho</div>
            <h1>Acompanhamento e reavaliação — criança/adolescente acolhido</h1>
          </div>
        </header>

        <section className="a4-box">
          <div className="a4-grid">
            <div><b>Nome(s)</b>{val(a, "nomes")}</div>
            <div><b>Nascimento</b>{val(a, "nascimentos")}</div>
            <div><b>Processo</b>{val(a, "processo")}</div>
            <div><b>Acolhimento</b>{formatDate(val(a, "data_acolhimento"))}</div>
            <div><b>Modalidade / unidade</b>{[val(a, "modalidade"), val(a, "unidade")].filter(Boolean).join(" — ")}</div>
            <div><b>Conselho Tutelar</b>{val(a, "conselho_tutelar")}</div>
            <div><b>Genitora</b>{val(a, "genitora")}</div>
            <div><b>Genitor</b>{val(a, "genitor")}</div>
            <div><b>Profissional(is)</b>{val(f, "acomp_1") || val(a, "profissional")}</div>
            <div><b>Data da reavaliação</b>{formatDate(val(f, "acomp_2"))}</div>
          </div>
        </section>

        {f ? (
          <div className="a4-cols">
            {sections.map((s) => (
              <section key={s.title} className="a4-sec">
                <h2>{s.title}</h2>
                {s.items.map((it, i) => (
                  <p key={i}><b>{it.label.replace(/, considerando a avaliação anterior:?$/, "")}</b> {it.value}</p>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <p style={{ color: "#666" }}>Acompanhamento ainda não preenchido para este acolhido.</p>
        )}

        <footer className="a4-foot">
          <div>Responsável técnico: ______________________________</div>
          <div>Porto Velho, ____ / ____ / ________</div>
        </footer>
      </article>
    </>
  );
}
