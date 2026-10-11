import type { Question } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";

export type Answers = Record<string, { label: string; value: string }>;

const val = (a: Answers | null | undefined, k: string) => a?.[k]?.value ?? "";

// Folha-resumo (A4): dados do acolhido + acompanhamento por seção.
export function ResumoA4({
  answers, followup, questions,
}: {
  answers: Answers;
  followup: Answers | null;
  questions: Question[]; // perguntas do acompanhamento, em ordem
}) {
  const sections: { title: string; items: { label: string; value: string }[] }[] = [];
  for (const q of questions) {
    if (["acomp_1", "acomp_2"].includes(q.key)) continue; // já estão no topo
    const ans = followup?.[q.key];
    if (!ans) continue;
    let s = sections.find((x) => x.title === q.section);
    if (!s) sections.push((s = { title: q.section, items: [] }));
    s.items.push({ label: q.label, value: ans.value });
  }

  return (
    <article className="a4">
      <header className="a4-head">
        <div className="a4-org">Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho/RO</div>
        <h1>Acompanhamento e reavaliação — criança/adolescente acolhido</h1>
      </header>

      <section className="a4-box">
        <div className="a4-grid">
          <div><b>Nome(s)</b>{val(answers, "nomes")}</div>
          <div><b>Nascimento</b>{val(answers, "nascimentos")}</div>
          <div><b>Processo</b>{val(answers, "processo")}</div>
          <div><b>Acolhimento</b>{formatDate(val(answers, "data_acolhimento"))}</div>
          <div><b>Modalidade / unidade</b>{[val(answers, "modalidade"), val(answers, "unidade")].filter(Boolean).join(" — ")}</div>
          <div><b>Conselho Tutelar</b>{val(answers, "conselho_tutelar")}</div>
          <div><b>Genitora</b>{val(answers, "genitora")}</div>
          <div><b>Genitor</b>{val(answers, "genitor")}</div>
          <div><b>Profissional(is)</b>{val(followup, "acomp_1") || val(answers, "profissional")}</div>
          <div><b>Data da reavaliação</b>{formatDate(val(followup, "acomp_2"))}</div>
        </div>
      </section>

      {followup ? (
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
  );
}
