import JSZip from "jszip";
import type { Ans } from "@/lib/records";
import { AXES, acompTexts, changeSentence } from "@/lib/acomp";

// Modelo do relatório (.docx) guardado no Supabase Storage.
export const REPORT_BUCKET = "modelos";
export const REPORT_PATH = "relatorio-inicial-de-acompanhamento.docx";

export const TODO = "[preencher]";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (v: string) => { const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : v; };
const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// "dd/mm/aaaa" (ou várias, separadas por ;) -> "7 anos; 5 anos"
export function ageFrom(births: string, ref = new Date()): string {
  const out: string[] = [];
  for (const part of births.split(/[;\n]/)) {
    const m = part.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) continue;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    let a = ref.getFullYear() - d.getFullYear();
    if (ref.getMonth() < d.getMonth() || (ref.getMonth() === d.getMonth() && ref.getDate() < d.getDate())) a--;
    out.push(a < 1 ? "menos de 1 ano" : `${a} ${a === 1 ? "ano" : "anos"}`);
  }
  return out.join("; ");
}

// Respostas do Cadastro inicial -> texto de cada {{MARCADOR}} do relatório.
// Valor de uma pergunta isolada (para {{Q:chave}} nos parágrafos editados).
export function questionValues(a: Ans): Record<string, string> {
  return Object.fromEntries(Object.entries(a)
    .filter(([k, v]) => !k.startsWith("_") && v && typeof v === "object" && "value" in v)
    .map(([k, v]) => [`Q:${k}`, iso(String(v.value))]));
}

export function reportValues(a: Ans, now = new Date()): Record<string, string> {
  const v = (k: string) => (a[k]?.value ?? "").trim();
  const join = (...p: string[]) => p.map((x) => x.trim()).filter(Boolean).join(". ").replace(/\.\./g, ".");
  const withInfo = (opt: string, info: string) => join(opt, info);

  const outros = v("outros_processos");
  const processosRel = outros === "Sim" ? join("Sim", v("outros_processos_numeros")) : outros;

  return {
    PROCESSO: v("processo"),
    NOME_ACOLHIDO: v("nomes"),
    DATA_NASCIMENTO: v("nascimentos"),
    IDADE: ageFrom(v("nascimentos"), now),
    DATA_ACOLHIMENTO: iso(v("data_acolhimento")),
    CONSELHO_TUTELAR: v("conselho_tutelar"),
    MODALIDADE: v("modalidade"),
    UNIDADE: v("unidade"),
    PROFISSIONAIS: v("profissional"),
    NOME_GENITORA: v("genitora"),
    ENDERECO_GENITORA: v("genitora_endereco"),
    CONTATO_GENITORA: v("genitora_contato"),
    NOME_GENITOR: v("genitor"),
    ENDERECO_GENITOR: v("genitor_endereco"),
    CONTATO_GENITOR: v("genitor_contato"),
    FAMILIA_EXTENSA_CONTATOS: v("familia_extensa_contatos"),
    PROCESSOS_RELACIONADOS: processosRel,
    CONTEXTO_ACOLHIMENTO: join(v("situacoes") && `Situação(ões) relacionada(s) ao acolhimento: ${v("situacoes")}`, v("sintese")),
    PROCEDIMENTOS: v("procedimentos"),
    ACOLHIMENTO_ADAPTACAO: withInfo(v("acolhimento_adaptacao"), v("acolhimento_adaptacao_info")),
    EDUCACAO: withInfo(v("educacao"), v("educacao_info")),
    SAUDE: withInfo(v("saude"), v("saude_info")),
    ASPECTOS_EMOCIONAIS: withInfo(v("emocional"), v("emocional_info")),
    CONVIVENCIA_FAMILIAR: withInfo(v("convivencia_familiar"), v("convivencia_familiar_info")),
    CONVIVENCIA_COMUNITARIA: withInfo(
      v("convivencia_comunitaria") === "Sim" ? "Possui vínculos significativos externos ao serviço de acolhimento"
        : v("convivencia_comunitaria") === "Não" ? "Não possui vínculos significativos externos ao serviço de acolhimento"
        : v("convivencia_comunitaria") && `Vínculos significativos externos ao serviço de acolhimento: ${v("convivencia_comunitaria")}`,
      v("convivencia_comunitaria_info"),
    ),
    SITUACAO_GENITORA: withInfo(lower(v("situacao_genitora")), v("situacao_genitora_info")),
    SITUACAO_GENITOR: withInfo(lower(v("situacao_genitor")), v("situacao_genitor_info")),
    SITUACAO_FAMILIA_EXTENSA: withInfo(lower(v("situacao_familia_extensa")), v("familia_extensa_info")),
    ANALISE_TECNICA: [
      v("fatores_risco") && `Principais fatores de risco/fragilidades identificados: ${v("fatores_risco")}`,
      v("fatores_protecao") && `Principais fatores de proteção/recursos identificados: ${v("fatores_protecao")}`,
    ].filter(Boolean).join("\n\n"),
    PERSPECTIVA: v("perspectiva"),
    PARECER_TECNICO: TODO, // escrito pela equipe técnica no próprio relatório
    QUESTOES_PROXIMO_ACOMPANHAMENTO: v("questoes_pendentes"),
    LOCAL_DATA: `Porto Velho/RO, ${now.getDate()} de ${MESES[now.getMonth()]} de ${now.getFullYear()}.`,
  };
}

// O Word costuma quebrar um marcador em vários trechos ao editar (ex.: "{{PRO" + "CESSO}}").
// Aqui juntamos o texto desses parágrafos para o marcador voltar a ficar inteiro.
export function normalizeMarkers(xml: string): string {
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (para) => {
    const runs = [...para.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)];
    if (runs.length < 2) return para;
    const joined = runs.map((m) => m[1]).join("");
    const markers = joined.match(/\{\{[A-Z_]+\}\}/g);
    if (!markers) return para;
    const whole = markers.every((mk) => runs.some((m) => m[1].includes(mk)));
    if (whole) return para;
    let i = 0;
    return para.replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, () =>
      i++ === 0 ? `<w:t xml:space="preserve">${joined}</w:t>` : `<w:t xml:space="preserve"></w:t>`);
  });
}

// Lê um .docx e devolve os marcadores {{...}} que ele contém.
export async function markersOf(buf: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buf);
  const f = zip.file("word/document.xml");
  if (!f) throw new Error("Não é um arquivo .docx válido.");
  const xml = normalizeMarkers(await f.async("string"));
  const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
  return [...new Set((text.match(/\{\{[A-Z_]+\}\}/g) ?? []).map((m) => m.slice(2, -2)))];
}

// Campos que entram no meio de uma frase do modelo (começam com letra minúscula).
const LOWER_INLINE = new Set([
  "ACOLHIMENTO_ADAPTACAO", "EDUCACAO", "SAUDE", "ASPECTOS_EMOCIONAIS", "CONVIVENCIA_FAMILIAR", "CONVIVENCIA_COMUNITARIA", "PERSPECTIVA",
  "PERSPECTIVAS_ENCAMINHAMENTO",
  ...["ACOLHIMENTO", "EDUCACAO", "SAUDE", "EMOCIONAL", "CONVIVENCIA_FAMILIAR", "CONVIVENCIA_COMUNITARIA"].flatMap((x) => [`SITUACAO_ANTERIOR_${x}`, `SITUACAO_ATUAL_${x}`]),
]);

// Preenche o .docx: troca cada {{MARCADOR}} pelo texto correspondente.
export async function fillDocx(
  template: Buffer, values: Record<string, string>,
  edit?: (xml: string) => string,
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Modelo inválido");
  let xml = normalizeMarkers(await file.async("string"));
  if (edit) xml = edit(xml);
  xml = xml.replace(/<w:t>/g, '<w:t xml:space="preserve">');
  const encode = (t: string) => esc(t).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
  const lowerFirst = (t: string) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2}/.test(t) || !t ? t : t.charAt(0).toLowerCase() + t.slice(1));
  for (const [ph, raw] of Object.entries(values)) {
    const base = raw.trim() || "—";
    // o modelo pode continuar a frase ("... verifica-se que {{CAMPO}}."): sem ponto repetido e com a inicial em minúscula
    const re = new RegExp(`(<w:t[^>]*>)([^<]*?)\\{\\{${ph}\\}\\}([.,;]?)`, "g");
    xml = xml.replace(re, (_m, open: string, pre: string, after: string) => {
      let v = base;
      if (after) v = v.replace(/[.\s]+$/, "") || v;
      if (LOWER_INLINE.has(ph) && pre.trim().length > 0 && v !== "—") v = lowerFirst(v);
      return `${open}${pre}${encode(v)}${after}`;
    });
    xml = xml.split(`{{${ph}}}`).join(encode(base));
  }
  xml = xml.replace(/\{\{Q:[A-Za-z0-9_]+\}\}/g, "—"); // pergunta sem resposta
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// De onde vem cada marcador (para mostrar o modelo ao usuário).
export const PLACEHOLDER_SOURCE: Record<string, string> = {
  PROCESSO: "2. Número do processo",
  NOME_ACOLHIDO: "3. Nome completo da(s) criança(s)/adolescente(s)",
  DATA_NASCIMENTO: "4. Data de nascimento",
  IDADE: "Calculada pela data de nascimento",
  DATA_ACOLHIMENTO: "7. Data do acolhimento",
  CONSELHO_TUTELAR: "7.1 Conselho Tutelar responsável",
  MODALIDADE: "8. Modalidade atual de acolhimento",
  UNIDADE: "9. Unidade/serviço de acolhimento",
  PROFISSIONAIS: "1. Profissional responsável pelo acompanhamento",
  NOME_GENITORA: "5. Nome da genitora",
  ENDERECO_GENITORA: "5.1 Endereço da genitora",
  CONTATO_GENITORA: "5.2 Telefone/Contato da genitora",
  NOME_GENITOR: "6. Nome do genitor",
  ENDERECO_GENITOR: "6.1 Endereço do genitor",
  CONTATO_GENITOR: "6.2 Telefone/Contato do genitor",
  FAMILIA_EXTENSA_CONTATOS: "21.1 Identificação e contato dos familiares",
  PROCESSOS_RELACIONADOS: "Outros processos judiciais relacionados (e números)",
  CONTEXTO_ACOLHIMENTO: "11. Situação(ões) do acolhimento + 12. Síntese",
  PROCEDIMENTOS: "10. Procedimentos realizados na avaliação inicial",
  ACOLHIMENTO_ADAPTACAO: "13. Acolhimento e adaptação + 13.1",
  EDUCACAO: "14. Educação + 14.1",
  SAUDE: "15. Saúde + 15.1",
  ASPECTOS_EMOCIONAIS: "16. Aspectos emocionais/comportamentais + 16.1",
  CONVIVENCIA_FAMILIAR: "17. Convivência familiar + 17.1",
  CONVIVENCIA_COMUNITARIA: "18. Convivência comunitária + 18.1",
  SITUACAO_GENITORA: "19. Situação da genitora + 19.1",
  SITUACAO_GENITOR: "20. Situação do genitor + 20.1",
  SITUACAO_FAMILIA_EXTENSA: "21. Situação da família extensa + 21.2",
  ANALISE_TECNICA: "22. Fatores de risco + 23. Fatores de proteção",
  PERSPECTIVA: "24. Perspectiva de encaminhamento",
  PARECER_TECNICO: "Escrito pela equipe técnica no próprio relatório (aparece como [preencher])",
  QUESTOES_PROXIMO_ACOMPANHAMENTO: "25. Questões pendentes e/ou aspectos a acompanhar",
  LOCAL_DATA: "Gerado automaticamente (cidade e data de hoje)",
};

// ---- Relatório de acompanhamento e reavaliação ----
export const ACOMP_PATH = "relatorio-acompanhamento-reavaliacao.docx";
// Base do relatório de fiscalização: cabeçalho, página e estilos (o texto vem do questionário)
export const FISC_BASE_PATH = "relatorio-fiscalizacao.docx";

// Identificação vem do Cadastro inicial; os demais campos vêm do questionário do acompanhamento.
export function acompValues(
  a: Ans, signer: { name: string; registry: string }, answers: Record<string, string> = {}, now = new Date(),
  prev: Record<string, string> = {}, // situação anterior de cada eixo (acompanhamento anterior ou Cadastro inicial)
): Record<string, string> {
  const base = reportValues(a, now);
  const t = acompTexts(answers);
  const mine = (k: string) => (t[k] ?? "").trim() || TODO;
  return {
    PROCESSO: base.PROCESSO,
    CRIANCAS: base.NOME_ACOLHIDO,
    NASCIMENTOS: base.DATA_NASCIMENTO,
    IDADE: base.IDADE,
    GENITORA: base.NOME_GENITORA,
    GENITOR: base.NOME_GENITOR,
    DATA_ACOLHIMENTO: base.DATA_ACOLHIMENTO,
    MODALIDADE: base.MODALIDADE,
    UNIDADE: base.UNIDADE,
    PROFISSIONAL: t.PROFISSIONAL || base.PROFISSIONAIS,
    PROCEDIMENTOS: mine("PROCEDIMENTOS"),
    // situação anterior (formulário imediatamente anterior) x atual (formulário enviado) x o que mudou
    ...Object.fromEntries(AXES.flatMap((ax) => [
      [`SITUACAO_ANTERIOR_${ax.m}`, (prev[ax.k] ?? "").trim() || "não foram registradas informações específicas"],
      [`SITUACAO_ATUAL_${ax.m}`, (answers[`${ax.k}_info`] ?? "").trim() || "não foram registradas informações específicas no período"],
      [`ALTERACOES_${ax.m}`, changeSentence(answers[ax.k] ?? "")],
    ])),
    PERSPECTIVAS_ENCAMINHAMENTO: (answers.perspectiva ?? "").trim()
      ? [answers.perspectiva.trim(), (answers.perspectiva_info ?? "").trim().replace(/[.\s]+$/, "")].filter(Boolean).join(" – ")
      : TODO,
    COMPARATIVO_ACOLHIMENTO: mine("COMPARATIVO_ACOLHIMENTO"),
    COMPARATIVO_EDUCACAO: mine("COMPARATIVO_EDUCACAO"),
    COMPARATIVO_SAUDE: mine("COMPARATIVO_SAUDE"),
    COMPARATIVO_EMOCIONAL: mine("COMPARATIVO_EMOCIONAL"),
    COMPARATIVO_CONVIVENCIA_FAMILIAR: mine("COMPARATIVO_CONVIVENCIA_FAMILIAR"),
    COMPARATIVO_CONVIVENCIA_COMUNITARIA: mine("COMPARATIVO_CONVIVENCIA_COMUNITARIA"),
    SITUACAO_GENITORA: mine("SITUACAO_GENITORA"),
    SITUACAO_GENITOR: mine("SITUACAO_GENITOR"),
    SITUACAO_FAMILIA_EXTENSA: mine("SITUACAO_FAMILIA_EXTENSA"),
    // pergunta opcional do formulário: sem resposta, não deixa marcador pendente
    INFORMACOES_FAMILIARES: (t.INFORMACOES_FAMILIARES ?? "").trim() || (answers.familia_info !== undefined || answers.genitora ? "Sem informações adicionais no período." : TODO),
    ACOMPANHAMENTO_PENDENCIAS: mine("ACOMPANHAMENTO_PENDENCIAS"),
    PENDENCIAS_PROXIMO_PERIODO: mine("PENDENCIAS_PROXIMO_PERIODO"),
    ANALISE_PSICOSSOCIAL: mine("ANALISE_PSICOSSOCIAL"),
    LOCAL_DATA: t.LOCAL_DATA || base.LOCAL_DATA,
    ASSINATURA: [signer.name, signer.registry].filter(Boolean).join(" – "),
    // perguntas novas do questionário: use {{Q:chave}} no modelo para colocar a resposta
    ...Object.fromEntries(Object.entries(answers).filter(([k]) => /^[A-Za-z0-9_]+$/.test(k)).map(([k, v]) => [`Q:${k}`, String(v)])),
  };
}
