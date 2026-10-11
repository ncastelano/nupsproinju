import { reportValues } from "@/lib/report";
import type { Ans, RecMeta } from "@/lib/records";

// Questionário do Relatório de acompanhamento e reavaliação: um campo para cada trecho do modelo que precisa de texto.
export type AcompField = { key: string; label: string; help?: string; prev?: string; rows?: number };
export type AcompGroup = { title: string; fields: AcompField[] };

export const ACOMP_GROUPS: AcompGroup[] = [
  {
    title: "3. Procedimentos técnicos realizados",
    fields: [{
      key: "PROCEDIMENTOS", label: "Procedimentos realizados na reavaliação",
      help: "Um por linha. Ex.: 16/09/2026 - Entrevista com a equipe técnica da unidade.", rows: 5,
    }],
  },
  {
    title: "4. Acompanhamento da situação atual",
    fields: [
      { key: "COMPARATIVO_ACOLHIMENTO", label: "4.1 Acolhimento e adaptação", prev: "ACOLHIMENTO_ADAPTACAO" },
      { key: "COMPARATIVO_EDUCACAO", label: "4.2 Educação", prev: "EDUCACAO" },
      { key: "COMPARATIVO_SAUDE", label: "4.3 Saúde", prev: "SAUDE" },
      { key: "COMPARATIVO_EMOCIONAL", label: "4.4 Aspectos emocionais/comportamentais", prev: "ASPECTOS_EMOCIONAIS" },
      { key: "COMPARATIVO_CONVIVENCIA_FAMILIAR", label: "4.5 Convivência familiar", prev: "CONVIVENCIA_FAMILIAR" },
      { key: "COMPARATIVO_CONVIVENCIA_COMUNITARIA", label: "4.6 Convivência comunitária e vínculos significativos", prev: "CONVIVENCIA_COMUNITARIA" },
    ],
  },
  {
    title: "5. Situação familiar atual",
    fields: [
      { key: "SITUACAO_GENITORA", label: "Quanto à genitora", help: "Completa a frase: “Quanto à genitora, verifica-se que …”", prev: "SITUACAO_GENITORA", rows: 3 },
      { key: "SITUACAO_GENITOR", label: "Quanto ao genitor", help: "Completa a frase: “Quanto ao genitor, verifica-se que …”", prev: "SITUACAO_GENITOR", rows: 3 },
      { key: "SITUACAO_FAMILIA_EXTENSA", label: "Quanto à família extensa", help: "Completa a frase: “Quanto à família extensa, verifica-se que …”", prev: "SITUACAO_FAMILIA_EXTENSA", rows: 3 },
      { key: "INFORMACOES_FAMILIARES", label: "Outras informações familiares", rows: 3 },
    ],
  },
  {
    title: "6. Acompanhamento das questões anteriores",
    fields: [{
      key: "ACOMPANHAMENTO_PENDENCIAS", label: "O que se verificou sobre as questões pendentes da avaliação anterior",
      help: "Completa a frase: “…verificou-se que …”", prev: "QUESTOES_PROXIMO_ACOMPANHAMENTO",
    }],
  },
  {
    title: "7. Questões pendentes e/ou aspectos a serem acompanhados",
    fields: [{ key: "PENDENCIAS_PROXIMO_PERIODO", label: "Questões pendentes e aspectos a acompanhar no próximo período" }],
  },
  {
    title: "8. Análise psicossocial",
    fields: [{ key: "ANALISE_PSICOSSOCIAL", label: "Análise psicossocial", rows: 8 }],
  },
];

// Para comparar: o que a avaliação anterior disse (último acompanhamento anterior, ou o Cadastro inicial).
export function previousTexts(answers: Ans, meta: RecMeta, n: number): Record<string, string> {
  const base = reportValues(answers);
  const earlier = Object.keys(meta.acompData ?? {}).map(Number).filter((k) => k < n).sort((a, b) => b - a)[0];
  const prevAns = earlier !== undefined ? meta.acompData![String(earlier)] : null;
  const out: Record<string, string> = {};
  for (const g of ACOMP_GROUPS) for (const f of g.fields) {
    if (!f.prev) continue;
    const fromAcomp = prevAns?.[f.key]?.trim();
    const fromCad = base[f.prev];
    // ACOMPANHAMENTO_PENDENCIAS compara com o que foi indicado como pendente antes
    const v = f.key === "ACOMPANHAMENTO_PENDENCIAS"
      ? (prevAns?.PENDENCIAS_PROXIMO_PERIODO?.trim() || fromCad)
      : (fromAcomp || fromCad);
    if (v && v !== "—") out[f.key] = v;
  }
  return out;
}
