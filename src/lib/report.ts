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
