import JSZip from "jszip";
import type { Ans } from "@/lib/records";

// Modelo do relatório (.docx) guardado no Supabase Storage.
export const REPORT_BUCKET = "modelos";
export const REPORT_PATH = "relatorio-inicial-de-acompanhamento.docx";

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
      v("convivencia_comunitaria") && `Possui vínculos significativos externos ao serviço de acolhimento: ${v("convivencia_comunitaria")}`,
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
    QUESTOES_PROXIMO_ACOMPANHAMENTO: v("questoes_pendentes"),
    LOCAL_DATA: `Porto Velho/RO, ${now.getDate()} de ${MESES[now.getMonth()]} de ${now.getFullYear()}.`,
  };
}

// Preenche o .docx: troca cada {{MARCADOR}} pelo texto correspondente.
export async function fillDocx(template: Buffer, values: Record<string, string>): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Modelo inválido");
  let xml = await file.async("string");
  xml = xml.replace(/<w:t>/g, '<w:t xml:space="preserve">');
  for (const [ph, raw] of Object.entries(values)) {
    const text = esc(raw.trim() || "—").replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
    xml = xml.split(`{{${ph}}}`).join(text);
  }
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
  QUESTOES_PROXIMO_ACOMPANHAMENTO: "25. Questões pendentes e/ou aspectos a acompanhar",
  LOCAL_DATA: "Gerado automaticamente (cidade e data de hoje)",
};
