import { normalizeMarkers } from "@/lib/report";

// Edição do modelo dentro do sistema: troca o texto de parágrafos do .docx, mantendo estilo e cabeçalho.
export const CONFIG_PATH = "relatorio-config.json";
export type ReportConfig = { paragraphs: Record<string, string> };

const P_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;
const T_RE = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function textOf(p: string) {
  const parts: string[] = [];
  const body = p.replace(/<w:br[^>]*\/>/g, "\u0001").replace(/<w:tab\s*\/>/g, "\t");
  for (const m of body.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|\u0001/g)) parts.push(m[0] === "\u0001" ? "\n" : unesc(m[1]));
  return parts.join("");
}

export function listParagraphs(xmlRaw: string): { i: number; text: string }[] {
  const xml = normalizeMarkers(xmlRaw);
  const out: { i: number; text: string }[] = [];
  let i = 0;
  for (const m of xml.matchAll(P_RE)) out.push({ i: i++, text: textOf(m[0]) });
  return out;
}

// Aplica os textos editados (índice do parágrafo -> texto com {{CAMPOS}}).
export function applyConfig(xmlRaw: string, cfg: ReportConfig | null): string {
  const xml = normalizeMarkers(xmlRaw);
  if (!cfg || Object.keys(cfg.paragraphs).length === 0) return xml;
  let i = 0;
  return xml.replace(P_RE, (p) => {
    const idx = String(i++);
    const text = cfg.paragraphs[idx];
    if (text === undefined) return p;
    const open = p.match(/^<w:p(?:\s[^>]*)?>/)?.[0] ?? "<w:p>";
    const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    const rPr = p.match(/<w:r(?:\s[^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/)?.[1] ?? "";
    const runs = text.split("\n").map((line, k) =>
      `${k ? "<w:br/>" : ""}<w:t xml:space="preserve">${esc(line)}</w:t>`).join("");
    return `${open}${pPr}<w:r>${rPr}${runs}</w:r></w:p>`;
  });
}
