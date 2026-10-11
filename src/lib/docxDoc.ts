import JSZip from "jszip";

// Leitura e gravação do .docx do processo para o editor da tela.
// O modelo do NUPS só usa parágrafos simples (espaçamento, recuo, alinhamento, negrito, tamanho),
// então cada parágrafo vira um objeto e é regravado inteiro; cabeçalho, imagem e página ficam intactos.

export type Run = { t: string; b?: boolean; i?: boolean; u?: boolean; sz: number };
export type Para = {
  jc?: "left" | "center" | "right" | "both";
  sp: Record<string, string>;   // atributos de <w:spacing> (line, before, after)
  ind: Record<string, string>;  // atributos de <w:ind> (firstLine, left, right, hanging)
  sz: number;                   // tamanho padrão do parágrafo (meios pontos)
  font: string;
  runs: Run[];
};
export type DocHeader = {
  src: string;           // data URL da imagem
  x: number; y: number;  // px, relativos à página
  w: number; h: number;  // px
  crop: { l: number; r: number; t: number; b: number }; // frações 0–1
} | null;
export type DocData = {
  paras: Para[];
  page: { w: number; h: number; top: number; bottom: number; left: number; right: number }; // px (96 dpi)
  header: DocHeader;
};

const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/w:(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const on = (rpr: string, tag: string) => {
  const m = rpr.match(new RegExp(`<w:${tag}(?:\\s[^>]*)?/>`));
  if (!m) return false;
  const v = m[0].match(/w:val="([^"]*)"/)?.[1];
  return v === undefined || !["0", "false", "none"].includes(v);
};

const P_RE = /<w:p[ >][\s\S]*?<\/w:p>/g;
const R_RE = /<w:r[ >][\s\S]*?<\/w:r>/g;

function parsePara(p: string): Para {
  const ppr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const mark = ppr.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  const sz = Number(mark.match(/<w:sz w:val="(\d+)"/)?.[1] ?? 24);
  const font = mark.match(/w:ascii="([^"]*)"/)?.[1] ?? "Times New Roman";
  const jcRaw = ppr.match(/<w:jc w:val="(\w+)"/)?.[1];
  const jc = jcRaw === "center" || jcRaw === "right" || jcRaw === "both" ? jcRaw : jcRaw === "left" || jcRaw === "start" ? "left" : undefined;
  const runs: Run[] = [];
  for (const [r] of p.matchAll(R_RE)) {
    const rpr = r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
    let t = "";
    for (const m of r.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab[^>]*\/>|<w:br[^>]*\/>/g)) {
      t += m[0].startsWith("<w:tab") ? "\t" : m[0].startsWith("<w:br") ? "\n" : unesc(m[1]);
    }
    if (!t) continue;
    runs.push({
      t, b: on(rpr, "b") || undefined, i: on(rpr, "i") || undefined, u: on(rpr, "u") || undefined,
      sz: Number(rpr.match(/<w:sz w:val="(\d+)"/)?.[1] ?? sz),
    });
  }
  return {
    jc, font, sz,
    sp: attrs(ppr.match(/<w:spacing[^>]*>/)?.[0] ?? ""),
    ind: attrs(ppr.match(/<w:ind[^>]*>/)?.[0] ?? ""),
    runs,
  };
}

export async function parseDocx(buf: Buffer): Promise<DocData> {
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file("word/document.xml")!.async("string"));
  const body = xml.slice(xml.indexOf("<w:body>"));
  const paras = [...body.matchAll(P_RE)].map((m) => parsePara(m[0]));

  const sect = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";
  const pg = (tag: string, a: string, d: number) => Number(sect.match(new RegExp(`<w:${tag}[^>]*w:${a}="(\\d+)"`))?.[1] ?? d) / 15;
  const page = {
    w: pg("pgSz", "w", 11909), h: pg("pgSz", "h", 16834),
    top: pg("pgMar", "top", 1440), bottom: pg("pgMar", "bottom", 1440),
    left: pg("pgMar", "left", 1440), right: pg("pgMar", "right", 1440),
  };
  const headerDist = pg("pgMar", "header", 720);

  // cabeçalho (imagem do NUPS/TJRO)
  let header: DocHeader = null;
  try {
    const hid = sect.match(/<w:headerReference[^>]*r:id="([^"]+)"/)?.[1];
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    const hfile = rels.match(new RegExp(`<Relationship[^>]*Id="${hid}"[^>]*Target="([^"]+)"`))?.[1]
      ?? rels.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${hid}"`))?.[1];
    if (hfile) {
      const hxml = await zip.file(`word/${hfile}`)!.async("string");
      const hrels = await zip.file(`word/_rels/${hfile}.rels`)!.async("string");
      const emb = hxml.match(/r:embed="([^"]+)"/)?.[1];
      const target = hrels.match(new RegExp(`<Relationship[^>]*Id="${emb}"[^>]*Target="([^"]+)"`))?.[1]
        ?? hrels.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${emb}"`))?.[1];
      const img = target && zip.file(`word/${target}`);
      if (img) {
        const ext = (target.split(".").pop() ?? "jpeg").toLowerCase().replace("jpg", "jpeg");
        const b64 = await img.async("base64");
        const num = (re: RegExp, d = 0) => Number(hxml.match(re)?.[1] ?? d);
        const src = hxml.match(/<a:srcRect([^>]*)\/>/)?.[1] ?? "";
        const c = (k: string) => Number(src.match(new RegExp(`${k}="(-?\\d+)"`))?.[1] ?? 0) / 100000;
        header = {
          src: `data:image/${ext};base64,${b64}`,
          x: page.left + num(/<wp:positionH[\s\S]*?<wp:posOffset>(-?\d+)</) / 9525,
          y: headerDist + num(/<wp:positionV[\s\S]*?<wp:posOffset>(-?\d+)</) / 9525,
          w: num(/<wp:extent cx="(\d+)"/) / 9525,
          h: num(/<wp:extent cx="\d+" cy="(\d+)"/) / 9525,
          crop: { l: c("l"), r: c("r"), t: c("t"), b: c("b") },
        };
      }
    }
  } catch { header = null; }

  return { paras, page, header };
}

const rfonts = (f: string) => `<w:rFonts w:ascii="${f}" w:cs="${f}" w:eastAsia="${f}" w:hAnsi="${f}"/>`;

function paraXml(p: Para): string {
  const attr = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => ` w:${k}="${esc(v)}"`).join("");
  const sp = Object.keys(p.sp).length ? `<w:spacing${attr(p.sp)}/>` : "";
  const ind = Object.keys(p.ind).length ? `<w:ind${attr(p.ind)}/>` : "";
  const jc = p.jc ? `<w:jc w:val="${p.jc}"/>` : "";
  const mark = `<w:rPr>${rfonts(p.font)}<w:sz w:val="${p.sz}"/><w:szCs w:val="${p.sz}"/></w:rPr>`;
  const runs = p.runs.filter((r) => r.t !== "").map((r) => {
    const rpr = `<w:rPr>${rfonts(p.font)}${r.b ? "<w:b/><w:bCs/>" : ""}${r.i ? "<w:i/><w:iCs/>" : ""}`
      + `<w:sz w:val="${r.sz}"/><w:szCs w:val="${r.sz}"/>${r.u ? '<w:u w:val="single"/>' : ""}</w:rPr>`;
    const parts = r.t.split(/(\n|\t)/).map((s) =>
      s === "\n" ? "<w:br/>" : s === "\t" ? "<w:tab/>" : s ? `<w:t xml:space="preserve">${esc(s)}</w:t>` : "").join("");
    return `<w:r>${rpr}${parts}</w:r>`;
  }).join("");
  return `<w:p><w:pPr>${sp}${ind}${jc}${mark}</w:pPr>${runs}</w:p>`;
}

// Troca os parágrafos do documento pelos editados, preservando cabeçalho, página e estilos do arquivo.
export async function serializeDocx(buf: Buffer, paras: Para[]): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  const start = xml.indexOf("<w:body>") + "<w:body>".length;
  const sect = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";
  const out = `${xml.slice(0, start)}${paras.map(paraXml).join("")}${sect}</w:body></w:document>`;
  zip.file("word/document.xml", out);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// Valida o que vem do navegador antes de gravar.
export function cleanParas(input: unknown): Para[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 2000) return null;
  const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? Math.min(Math.max(Math.round(v), 2), 400) : d);
  const rec = (v: unknown) => Object.fromEntries(
    Object.entries((v && typeof v === "object" ? v : {}) as Record<string, unknown>)
      .filter(([k, x]) => /^\w+$/.test(k) && typeof x === "string" && /^-?\d+$|^auto$/.test(x as string)) as [string, string][],
  );
  return input.map((p) => {
    const o = (p ?? {}) as Record<string, unknown>;
    const jc = ["left", "center", "right", "both"].includes(o.jc as string) ? (o.jc as Para["jc"]) : undefined;
    const runs = (Array.isArray(o.runs) ? o.runs : []).slice(0, 500).map((r) => {
      const x = (r ?? {}) as Record<string, unknown>;
      return {
        t: String(x.t ?? "").slice(0, 50000),
        b: x.b ? true : undefined, i: x.i ? true : undefined, u: x.u ? true : undefined,
        sz: num(x.sz, 24),
      } satisfies Run;
    });
    const font = typeof o.font === "string" && /^[\w ]{1,40}$/.test(o.font) ? o.font : "Times New Roman";
    return { jc, sp: rec(o.sp), ind: rec(o.ind), sz: num(o.sz, 24), font, runs } satisfies Para;
  });
}
