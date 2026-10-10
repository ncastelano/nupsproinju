import JSZip from "jszip";
import type { Ans } from "@/lib/records";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (v: string) => { const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : v; };

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

// Preenche o .docx: troca cada {{MARCADOR}} pela resposta da pergunta ligada a ele.
export async function fillDocx(template: Buffer, map: Record<string, string>, answers: Ans): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("Modelo inválido");
  let xml = await file.async("string");

  const value = (key: string) => {
    let v = answers[key]?.value ?? "";
    if (!v && key === "idade") v = ageFrom(answers.nascimentos?.value ?? "");
    if (key === "data_acolhimento") v = iso(v);
    return v.trim() || "—";
  };

  xml = xml.replace(/<w:t>/g, '<w:t xml:space="preserve">');
  for (const [ph, key] of Object.entries(map)) {
    const text = esc(value(key)).replace(/\r?\n/g, '</w:t><w:br/><w:t xml:space="preserve">');
    xml = xml.split(`{{${ph}}}`).join(text);
  }
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
