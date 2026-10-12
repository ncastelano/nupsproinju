import { reportValues } from "@/lib/report";
import type { Ans, RecMeta } from "@/lib/records";
import type { FSection } from "@/lib/fisc";

// Questionário do acompanhamento e reavaliação (Google Forms do NUPS).
const STATUS = [
  "Houve alteração/evolução relevante",
  "Permanece sem alterações relevantes",
  "Não foi possível avaliar no período",
  "Não se aplica",
];
const REINT = (f: boolean) => [
  "Há indicativos favoráveis à reintegração familiar",
  "Há possibilidade de reintegração, condicionada à evolução de aspectos ainda em acompanhamento",
  "Não há, no momento, indicativos favoráveis à reintegração familiar",
  "Situação ainda em avaliação",
  f ? "Não localizada/sem informações atualizadas" : "Não localizado/sem informações atualizadas",
  f ? "Falecida" : "Falecido",
  "Não se aplica",
];
const EXTENSA = [
  "Há familiar com possibilidade de assumir os cuidados",
  "Há familiar disponível, ainda em avaliação",
  "Há familiares identificados, porém sem disponibilidade",
  "Familiares avaliados sem condições atuais",
  "Busca por família extensa em andamento",
  "Não foram identificadas possibilidades",
  "Outra situação",
];
const PERSPECTIVA = [
  "Reintegração à família nuclear",
  "Reintegração/colocação junto à família extensa",
  "Manutenção do acolhimento para continuidade das intervenções",
  "Inserção/manutenção em Serviço de Acolhimento em Família Acolhedora",
  "Colocação em família substituta",
  "Em avaliação/sem perspectiva definida no momento",
];

const axis = (key: string, n: number, label: string, infoLabel: string, help: string) => [
  { key, label: `${n}. Em relação ${label}, considerando a avaliação anterior:`, type: "radio" as const, options: STATUS, required: true },
  { key: `${key}_info`, label: `${n}.1 ${infoLabel}`, type: "textarea" as const, help },
];

export const ACOMP_SECTIONS: FSection[] = [
  {
    title: "Identificação",
    questions: [
      { key: "prof", label: "1. Profissional responsável pelo acompanhamento", type: "checkbox", options: [], required: true, help: "Marque todas que se aplicam. Você é incluído(a) automaticamente." },
      { key: "data", label: "3. Data da reavaliação", type: "date", required: true },
    ],
  },
  {
    title: "Procedimentos realizados no período",
    questions: [
      {
        key: "procedimentos", label: "4. Procedimentos realizados no período", type: "textarea", required: true,
        help: "Registrar a data, o procedimento realizado e a pessoa/instituição envolvida, utilizando uma linha para cada procedimento.",
      },
    ],
  },
  { title: "Acolhimento e adaptação", questions: axis("acolh", 5, "ao acolhimento e à adaptação", "Informações relevantes sobre acolhimento e adaptação no período",
      "Descrever alterações, evoluções, dificuldades ou outras informações relevantes. Em caso de grupo de irmãos, identificar nominalmente quando a informação não se aplicar a todos.") },
  { title: "Educação", questions: axis("edu", 6, "à situação educacional", "Informações educacionais relevantes no período",
      "Ex.: matrícula, frequência, rendimento, mudança de escola, dificuldades, avanços, cursos ou atividades profissionalizantes.") },
  { title: "Saúde", questions: axis("saude", 7, "à situação de saúde", "Informações relevantes sobre saúde no período",
      "Ex.: consultas, exames, diagnósticos, tratamentos, medicações, encaminhamentos, demandas pendentes ou evolução do acompanhamento.") },
  { title: "Aspectos emocionais/comportamentais", questions: axis("emo", 8, "aos aspectos emocionais e/ou comportamentais", "Informações relevantes sobre aspectos emocionais/comportamentais no período",
      "Ex: mudanças comportamentais, adaptação emocional, manejo de limites, relações interpessoais, acompanhamento psicológico.") },
  { title: "Convivência familiar", questions: axis("fam", 9, "à convivência familiar", "Informações relevantes sobre convivência familiar no período",
      "Ex.: visitas, contatos, aproximações, afastamentos, qualidade dos vínculos, reações da criança/adolescente aos contatos e alterações na dinâmica familiar.") },
  { title: "Convivência comunitária e vínculos significativos", questions: axis("comun", 10, "à convivência comunitária e/ou aos vínculos significativos", "Informações relevantes no período",
      "Ex.: padrinhos, pessoas de referência, atividades comunitárias, vínculos externos à unidade, atividades esportivas, culturais ou sociais.") },
  {
    title: "Situação familiar atual",
    questions: [
      { key: "genitora", label: "11. Situação atual da genitora quanto à possibilidade de reintegração familiar", type: "radio", options: REINT(true), required: true },
      { key: "genitor", label: "12. Situação atual do genitor quanto à possibilidade de reintegração familiar", type: "radio", options: REINT(false), required: true },
      { key: "extensa", label: "13. Situação atual da família extensa", type: "radio", options: EXTENSA, required: true },
      {
        key: "familia_info", label: "14. Informações relevantes sobre a situação familiar no período", type: "textarea",
        help: "Registrar alterações nas condições de cuidado, adesão aos acompanhamentos, organização familiar, rede de apoio, disponibilidade de familiares, avaliações realizadas e demais informações relevantes.",
      },
    ],
  },
  {
    title: "Acompanhamento das questões anteriores",
    questions: [
      {
        key: "pendencias", label: "15. Situação das questões pendentes e/ou aspectos indicados para acompanhamento na avaliação anterior", type: "textarea", required: true,
        help: "Registrar objetivamente os resultados, avanços, dificuldades ou pendências referentes aos aspectos indicados para acompanhamento na avaliação anterior.",
      },
    ],
  },
  {
    title: "Perspectiva atual",
    questions: [
      { key: "perspectiva", label: "16. Perspectiva atual de encaminhamento", type: "radio", options: PERSPECTIVA, other: true, required: true },
      { key: "perspectiva_info", label: "16.1 Informações relevantes sobre a perspectiva atual", type: "textarea", help: "Registrar apenas quando necessário para complementar ou justificar a perspectiva indicada." },
    ],
  },
  {
    title: "Próximo período",
    questions: [
      {
        key: "proximo", label: "17. Questões pendentes e/ou aspectos a serem acompanhados no próximo período", type: "textarea", required: true,
        help: "Indicar objetivamente as situações que deverão ser verificadas, acompanhadas ou reavaliadas no próximo período.",
      },
    ],
  },
];

export const ACOMP_KEYS = ACOMP_SECTIONS.flatMap((s) => s.questions.map((q) => q.key));

const OUTRO = "Outro: ";
const clean = (s: string) => (s.startsWith(OUTRO) ? `Outro: ${s.slice(OUTRO.length)}` : s);
const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const sentence = (...p: (string | undefined)[]) =>
  p.map((x) => (x ?? "").trim()).filter(Boolean).map((x) => x.replace(/[.\s]+$/, "")).join(". ");

// Respostas do questionário -> texto de cada campo {{...}} do relatório.
export function acompTexts(a: Record<string, string>): Record<string, string> {
  const g = (k: string) => (a[k] ?? "").trim();
  const old = (k: string) => (a[k] ?? "").trim(); // respostas antigas (campos em maiúsculas)
  const eixo = (k: string, oldKey: string) => (sentence(g(k), g(`${k}_info`)) ? sentence(g(k), g(`${k}_info`)) + "." : old(oldKey));
  const when = g("data").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return {
    PROCEDIMENTOS: g("procedimentos") || old("PROCEDIMENTOS"),
    COMPARATIVO_ACOLHIMENTO: eixo("acolh", "COMPARATIVO_ACOLHIMENTO"),
    COMPARATIVO_EDUCACAO: eixo("edu", "COMPARATIVO_EDUCACAO"),
    COMPARATIVO_SAUDE: eixo("saude", "COMPARATIVO_SAUDE"),
    COMPARATIVO_EMOCIONAL: eixo("emo", "COMPARATIVO_EMOCIONAL"),
    COMPARATIVO_CONVIVENCIA_FAMILIAR: eixo("fam", "COMPARATIVO_CONVIVENCIA_FAMILIAR"),
    COMPARATIVO_CONVIVENCIA_COMUNITARIA: eixo("comun", "COMPARATIVO_CONVIVENCIA_COMUNITARIA"),
    SITUACAO_GENITORA: lower(clean(g("genitora"))) || old("SITUACAO_GENITORA"),
    SITUACAO_GENITOR: lower(clean(g("genitor"))) || old("SITUACAO_GENITOR"),
    SITUACAO_FAMILIA_EXTENSA: lower(clean(g("extensa"))) || old("SITUACAO_FAMILIA_EXTENSA"),
    INFORMACOES_FAMILIARES: g("familia_info") || old("INFORMACOES_FAMILIARES"),
    ACOMPANHAMENTO_PENDENCIAS: g("pendencias") || old("ACOMPANHAMENTO_PENDENCIAS"),
    PENDENCIAS_PROXIMO_PERIODO: g("proximo") || old("PENDENCIAS_PROXIMO_PERIODO"),
    ANALISE_PSICOSSOCIAL: g("perspectiva")
      ? sentence(`Perspectiva atual de encaminhamento: ${clean(g("perspectiva"))}`, g("perspectiva_info")) + "."
      : old("ANALISE_PSICOSSOCIAL"),
    PROFISSIONAL: g("prof").split("; ").filter(Boolean).join(", "),
    LOCAL_DATA: when ? `Porto Velho/RO, ${Number(when[3])} de ${MESES[Number(when[2]) - 1]} de ${when[1]}.` : "",
  };
}

// Para comparar: o que a avaliação anterior disse (último acompanhamento anterior, ou o Cadastro inicial).
export function previousTexts(answers: Ans, meta: RecMeta, n: number): Record<string, string> {
  const base = reportValues(answers);
  const earlier = meta.acomps.filter((a) => !a.draft && a.n < n && meta.acompData?.[String(a.n)]).map((a) => a.n).sort((a, b) => b - a)[0];
  const prev = earlier !== undefined ? meta.acompData![String(earlier)] : null;
  const pick = (a?: string, b?: string) => {
    const v = (a || b || "").trim();
    return v && v !== "—" ? v : "";
  };
  const info = (k: string, cad: string) => pick(prev ? sentence(prev[k], prev[`${k}_info`]) : "", base[cad]);
  const out: Record<string, string> = {
    acolh_info: info("acolh", "ACOLHIMENTO_ADAPTACAO"),
    edu_info: info("edu", "EDUCACAO"),
    saude_info: info("saude", "SAUDE"),
    emo_info: info("emo", "ASPECTOS_EMOCIONAIS"),
    fam_info: info("fam", "CONVIVENCIA_FAMILIAR"),
    comun_info: info("comun", "CONVIVENCIA_COMUNITARIA"),
    genitora: pick(prev?.genitora, base.SITUACAO_GENITORA),
    genitor: pick(prev?.genitor, base.SITUACAO_GENITOR),
    extensa: pick(prev?.extensa, base.SITUACAO_FAMILIA_EXTENSA),
    pendencias: pick(prev?.proximo, base.QUESTOES_PROXIMO_ACOMPANHAMENTO),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

// Situação anterior de cada eixo para o relatório: o relatório n compara o acompanhamento imediatamente anterior
// (n-1, o último concluído antes dele) com o atual; no primeiro, a anterior é o Cadastro inicial.
export const AXES = [
  { m: "ACOLHIMENTO", k: "acolh", cad: "ACOLHIMENTO_ADAPTACAO" },
  { m: "EDUCACAO", k: "edu", cad: "EDUCACAO" },
  { m: "SAUDE", k: "saude", cad: "SAUDE" },
  { m: "EMOCIONAL", k: "emo", cad: "ASPECTOS_EMOCIONAIS" },
  { m: "CONVIVENCIA_FAMILIAR", k: "fam", cad: "CONVIVENCIA_FAMILIAR" },
  { m: "CONVIVENCIA_COMUNITARIA", k: "comun", cad: "CONVIVENCIA_COMUNITARIA" },
] as const;

export function previousSituation(answers: Ans, meta: RecMeta, n: number): Record<string, string> {
  const prevN = meta.acomps.filter((a) => !a.draft && a.n < n && meta.acompData?.[String(a.n)]).map((a) => a.n).sort((a, b) => b - a)[0];
  const out: Record<string, string> = {};
  if (prevN !== undefined) {
    const prev = meta.acompData![String(prevN)];
    for (const ax of AXES) out[ax.k] = (prev[`${ax.k}_info`] ?? "").trim();
  } else {
    const base = reportValues(answers);
    for (const ax of AXES) { const v = (base[ax.cad] ?? "").trim(); out[ax.k] = v === "—" ? "" : v; }
  }
  return out;
}

const CHANGE: Record<string, string> = {
  "Houve alteração/evolução relevante": "Em comparação com a avaliação anterior, houve alteração/evolução relevante neste aspecto.",
  "Permanece sem alterações relevantes": "Em comparação com a avaliação anterior, a situação permanece sem alterações relevantes.",
  "Não foi possível avaliar no período": "Não foi possível avaliar este aspecto no período.",
  "Não se aplica": "Este aspecto não se aplica no período.",
};
export const changeSentence = (status: string) => CHANGE[status.trim()] ?? "Sem informação sobre a comparação com a avaliação anterior.";
