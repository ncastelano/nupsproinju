import type { Question } from "@/lib/forms";

type Answers = Record<string, { label: string; value: string }>;

// Mostra as respostas agrupadas por seção, na ordem das perguntas (as removidas aparecem no fim).
export function RecordView({ answers, questions }: { answers: Answers; questions: Question[] }) {
  const known = new Set(questions.map((q) => q.key));
  const rows = [
    ...questions.filter((q) => answers[q.key]).map((q) => ({ section: q.section, ...answers[q.key] })),
    ...Object.entries(answers).filter(([k]) => !known.has(k)).map(([, a]) => ({ section: "", ...a })),
  ];
  let last = "\0";
  return (
    <div className="grid" style={{ gap: 10 }}>
      {rows.map((r, i) => {
        const head = r.section !== last && r.section ? r.section : null;
        last = r.section || last;
        return (
          <div key={i}>
            {head && <h3 className="section" style={{ margin: "10px 0 6px" }}>{head}</h3>}
            <div className="ans">
              <div className="ans-q">{r.label}</div>
              <div className="ans-a">{r.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function formatDate(v?: string) {
  if (!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}
