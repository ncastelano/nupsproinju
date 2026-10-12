import type { FSection } from "@/lib/fisc";
import type { Question } from "@/lib/forms";

// Resumo de um questionário para mostrar em um quadro (sem edição).
export type PreviewItem = { label: string; help?: string; kind: string; options?: string[]; required?: boolean; cond?: string; rows?: string[] };
export type PreviewSection = { title: string; items: PreviewItem[] };

const KIND: Record<string, string> = {
  text: "Texto curto", textarea: "Texto longo", number: "Número", date: "Data", select: "Lista", radio: "Escolha uma",
  checkbox: "Marcar várias", matrix: "Grade", radio_other: "Escolha uma (ou Outro)",
};

export function previewOf(sections: FSection[]): PreviewSection[] {
  const labels = new Map(sections.flatMap((s) => s.questions.map((q) => [q.key, q.label] as const)));
  return sections.map((s) => ({
    title: s.title,
    items: s.questions.map((q) => ({
      label: q.label, help: q.help, required: q.required,
      kind: (q.other && (q.type === "radio" || q.type === "checkbox") ? (q.type === "radio" ? "Escolha uma (ou Outro)" : "Marcar várias (ou Outro)") : KIND[q.type]) ?? q.type,
      options: q.options?.length ? q.options : undefined,
      rows: q.rows,
      cond: q.showIf ? `Aparece quando “${labels.get(q.showIf.key) ?? q.showIf.key}” ${q.showIf.is ? `for: ${q.showIf.is.join(" / ")}` : `não for: ${q.showIf.isNot?.join(" / ")}`}` : undefined,
    })),
  }));
}

export function previewOfQuestions(qs: Question[]): PreviewSection[] {
  const out: PreviewSection[] = [];
  for (const q of qs.filter((x) => x.active !== false)) {
    const title = q.section || "Perguntas";
    let sec = out.find((s) => s.title === title);
    if (!sec) { sec = { title, items: [] }; out.push(sec); }
    sec.items.push({
      label: q.label, help: q.help || undefined, required: q.required, kind: KIND[q.type] ?? q.type,
      options: q.options?.length ? q.options : undefined,
    });
  }
  return out;
}
