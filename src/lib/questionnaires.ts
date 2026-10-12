import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_BUCKET } from "@/lib/report";
import { ACOMP_SECTIONS } from "@/lib/acomp";
import { FISC_SECTIONS, type FQ, type FSection, type FType } from "@/lib/fisc";
import type { Question } from "@/lib/forms";

// Questionários editáveis pelo administrador (Acompanhamento e Fiscalizações ficam guardados como JSON;
// o Cadastro inicial continua na tabela form_questions).
export type QKind = "inicial" | "acomp" | "fisc";
const FILE: Partial<Record<QKind, string>> = { acomp: "questionario-acompanhamento.json", fisc: "questionario-fiscalizacao.json" };
const DEFAULTS: Partial<Record<QKind, FSection[]>> = { acomp: ACOMP_SECTIONS, fisc: FISC_SECTIONS };

const TYPES: FType[] = ["text", "textarea", "number", "date", "select", "radio", "checkbox", "matrix"];
export const INICIAL_TYPES: FType[] = ["text", "textarea", "date", "select", "radio", "checkbox"];

// Limpa o que veio do navegador (ou do arquivo) para um formato seguro.
export function cleanSections(input: unknown): FSection[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 60) return null;
  const seen = new Set<string>();
  let total = 0;
  const out: FSection[] = [];
  for (const raw of input) {
    const s = (raw ?? {}) as { title?: unknown; questions?: unknown };
    const qs: FQ[] = [];
    for (const r of Array.isArray(s.questions) ? s.questions : []) {
      const q = (r ?? {}) as Record<string, unknown>;
      const key = String(q.key ?? "");
      const label = String(q.label ?? "").trim().slice(0, 500);
      if (!/^[A-Za-z0-9_]{1,40}$/.test(key) || seen.has(key) || !label) continue;
      if (++total > 400) break;
      seen.add(key);
      const type = TYPES.includes(q.type as FType) ? (q.type as FType) : "text";
      const strs = (v: unknown, max: number) =>
        (Array.isArray(v) ? v : []).map((x) => String(x).trim().slice(0, 300)).filter(Boolean).slice(0, max);
      const si = q.showIf as { key?: unknown; is?: unknown; isNot?: unknown } | undefined;
      qs.push({
        key, label, type,
        ...(String(q.help ?? "").trim() ? { help: String(q.help).trim().slice(0, 1500) } : {}),
        ...(["select", "radio", "checkbox", "matrix"].includes(type) ? { options: strs(q.options, 60) } : {}),
        ...(q.other && (type === "radio" || type === "checkbox") ? { other: true } : {}),
        ...(type === "matrix" ? { rows: strs(q.rows, 40) } : {}),
        ...(q.required ? { required: true } : {}),
        ...(si && typeof si.key === "string" && /^[A-Za-z0-9_]{1,40}$/.test(si.key)
          ? { showIf: { key: si.key, ...(Array.isArray(si.is) ? { is: strs(si.is, 20) } : {}), ...(Array.isArray(si.isNot) ? { isNot: strs(si.isNot, 20) } : {}) } }
          : {}),
      });
    }
    out.push({ title: String(s.title ?? "").trim().slice(0, 120) || "Seção", questions: qs });
  }
  // condições que apontam para perguntas que não existem mais deixam de valer
  for (const s of out) for (const q of s.questions) if (q.showIf && !seen.has(q.showIf.key)) delete q.showIf;
  return out;
}

// Questionário em uso (o salvo pelo administrador, ou o padrão do sistema).
export async function loadSections(kind: "acomp" | "fisc"): Promise<FSection[]> {
  const file = FILE[kind]!;
  try {
    const { data } = await createAdminClient().storage.from(REPORT_BUCKET).download(file);
    if (data) {
      const ok = cleanSections(JSON.parse(await data.text()));
      if (ok) return ok;
    }
  } catch { /* usa o padrão */ }
  return DEFAULTS[kind]!;
}

export async function storeSections(kind: "acomp" | "fisc", sections: FSection[]) {
  const st = createAdminClient().storage.from(REPORT_BUCKET);
  const file = FILE[kind]!;
  const { data: old } = await st.download(file);
  if (old) {
    await st.upload(`anteriores/${file.replace(".json", "")}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`, Buffer.from(await old.arrayBuffer()), {
      contentType: "application/json",
    });
  }
  return st.upload(file, Buffer.from(JSON.stringify(sections)), { contentType: "application/json", upsert: true });
}

// Cadastro inicial: linhas do banco -> seções editáveis
export function questionsToSections(qs: Question[]): FSection[] {
  const out: FSection[] = [];
  for (const q of qs.filter((x) => x.active !== false)) {
    const title = q.section || "Perguntas";
    let sec = out.find((s) => s.title === title);
    if (!sec) { sec = { title, questions: [] }; out.push(sec); }
    const hasOther = q.options?.includes("Outro");
    const isRadio = q.type === "radio" || q.type === "radio_other";
    sec.questions.push({
      key: q.key, label: q.label, help: q.help || undefined, required: q.required,
      type: (isRadio ? "radio" : q.type) as FType,
      ...(q.options?.length ? { options: q.options.filter((o) => o !== "Outro") } : {}),
      ...(q.type === "radio_other" || (q.type === "checkbox" && hasOther) ? { other: true } : {}),
    });
  }
  return out;
}
