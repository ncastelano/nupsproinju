import JSZip from "jszip";

// Leitura e gravação do .docx para o editor da tela.
// Cada parágrafo, tabela e imagem vira um objeto e é regravado inteiro; cabeçalho e página do modelo ficam intactos.

export type Run = {
  t: string; b?: boolean; i?: boolean; u?: boolean; sz: number;
  f?: string;       // fonte (quando diferente da do parágrafo)
  c?: string;       // cor em hexadecimal (RRGGBB)
  cm?: number[];    // comentários que cobrem este trecho
};
export type ImgData = { src: string; ext: string; w: number; h: number; rid?: string }; // src = data URL; w,h em px
export type Para = {
  jc?: "left" | "center" | "right" | "both";
  sp: Record<string, string>;   // atributos de <w:spacing> (line, before, after)
  ind: Record<string, string>;  // atributos de <w:ind> (firstLine, left, right, hanging)
  sz: number;                   // tamanho padrão do parágrafo (meios pontos)
  font: string;
  runs: Run[];
  img?: ImgData;                // parágrafo de imagem
};
export type TableBlock = { kind: "table"; rows: Para[][][] }; // linhas -> células -> parágrafos
export type Block = Para | TableBlock;
export const isTable = (b: Block): b is TableBlock => (b as TableBlock).kind === "table";

export type DocComment = { id: number; author: string; date: string; text: string };
export type DocHeader = {
  src: string;           // data URL da imagem
  x: number; y: number;  // px, relativos à página
  rel: number;           // deslocamento horizontal a partir da margem esquerda (px)
  w: number; h: number;  // px
  crop: { l: number; r: number; t: number; b: number }; // frações 0–1
} | null;
export type PageData = { w: number; h: number; top: number; bottom: number; left: number; right: number }; // px (96 dpi)
export type DocData = {
  blocks: Block[];
  paras: Para[];        // só os parágrafos de texto do nível principal (para comparar versões)
  comments: DocComment[];
  page: PageData;
  header: DocHeader;
};

const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/w:(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const on = (rpr: string, tag: string) => {
  const m = rpr.match(new RegExp(`<w:${tag}(?:\\s[^>]*)?/>`));
  if (!m) return false;
  const v = m[0].match(/w:val="([^"]*)"/)?.[1];
  return v === undefined || !["0", "false", "none"].includes(v);
};
const relOf = (rels: string, id: string) =>
  rels.match(new RegExp(`<Relationship[^>]*Id="${id}"[^>]*Target="([^"]+)"`))?.[1]
  ?? rels.match(new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${id}"`))?.[1];
const mime = (ext: string) => (ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : "image/png");

type Media = Map<string, { src: string; ext: string }>; // rId -> imagem

const BLOCK_RE = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g;
const R_RE = /<w:r[ >][\s\S]*?<\/w:r>/g;
const TOK_RE = /<w:commentRangeStart [^>]*\/>|<w:commentRangeEnd [^>]*\/>|<w:r[ >][\s\S]*?<\/w:r>/g;

function parsePara(p: string, media: Media, active: Set<number>): Para {
  const ppr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const mark = ppr.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  const sz = Number(mark.match(/<w:sz w:val="(\d+)"/)?.[1] ?? 24);
  const font = mark.match(/w:ascii="([^"]*)"/)?.[1] ?? "Times New Roman";
  const jcRaw = ppr.match(/<w:jc w:val="(\w+)"/)?.[1];
  const jc = jcRaw === "center" || jcRaw === "right" || jcRaw === "both" ? jcRaw : jcRaw === "left" || jcRaw === "start" ? "left" : undefined;
  const runs: Run[] = [];
  let img: ImgData | undefined;

  for (const [tok] of p.matchAll(TOK_RE)) {
    if (tok.startsWith("<w:commentRangeStart")) { active.add(Number(tok.match(/w:id="(\d+)"/)?.[1])); continue; }
    if (tok.startsWith("<w:commentRangeEnd")) { active.delete(Number(tok.match(/w:id="(\d+)"/)?.[1])); continue; }
    const rpr = tok.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";

    // imagem em linha
    const emb = tok.match(/<a:blip[^>]*r:embed="([^"]+)"/)?.[1];
    if (emb && media.has(emb)) {
      const ext = media.get(emb)!;
      const cx = Number(tok.match(/<wp:extent cx="(\d+)"/)?.[1] ?? 0) / 9525;
      const cy = Number(tok.match(/<wp:extent cx="\d+" cy="(\d+)"/)?.[1] ?? 0) / 9525;
      img = { src: ext.src, ext: ext.ext, w: cx || 200, h: cy || 150, rid: emb };
      continue;
    }

    let t = "";
    for (const m of tok.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab[^>]*\/>|<w:br[^>]*\/>/g)) {
      t += m[0].startsWith("<w:tab") ? "\t" : m[0].startsWith("<w:br") ? "\n" : unesc(m[1]);
    }
    if (!t) continue;
    const color = rpr.match(/<w:color w:val="([0-9A-Fa-f]{6})"/)?.[1];
    const rf = rpr.match(/w:ascii="([^"]*)"/)?.[1];
    runs.push({
      t, b: on(rpr, "b") || undefined, i: on(rpr, "i") || undefined, u: on(rpr, "u") || undefined,
      sz: Number(rpr.match(/<w:sz w:val="(\d+)"/)?.[1] ?? sz),
      ...(rf && rf !== font ? { f: rf } : {}),
      ...(color && color.toUpperCase() !== "000000" ? { c: color.toUpperCase() } : {}),
      ...(active.size ? { cm: [...active] } : {}),
    });
  }
  return {
    jc, font, sz,
    sp: attrs(ppr.match(/<w:spacing[^>]*>/)?.[0] ?? ""),
    ind: attrs(ppr.match(/<w:ind[^>]*>/)?.[0] ?? ""),
    runs, ...(img ? { img } : {}),
  };
}

function parseTable(x: string, media: Media, active: Set<number>): TableBlock {
  const rows = [...x.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map(([tr]) =>
    [...tr.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map(([tc]) => {
      const ps = [...tc.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => parsePara(m[0], media, active));
      return ps.length ? ps : [parsePara("<w:p></w:p>", media, active)];
    }));
  return { kind: "table", rows };
}

export async function parseDocx(buf: Buffer): Promise<DocData> {
  const zip = await JSZip.loadAsync(buf);
  const xml = (await zip.file("word/document.xml")!.async("string"));
  const rels = (await zip.file("word/_rels/document.xml.rels")?.async("string")) ?? "";
  const body = xml.slice(xml.indexOf("<w:body>"));

  // imagens do corpo
  const media: Media = new Map();
  for (const m of rels.matchAll(/<Relationship [^>]*>/g)) {
    const tag = m[0];
    if (!/relationships\/image"/.test(tag)) continue;
    const id = tag.match(/Id="([^"]+)"/)?.[1];
    const target = tag.match(/Target="([^"]+)"/)?.[1];
    const f = id && target && zip.file(`word/${target}`);
    if (!f || !id || !target) continue;
    const ext = (target.split(".").pop() ?? "png").toLowerCase();
    media.set(id, { src: `data:${mime(ext)};base64,${await f.async("base64")}`, ext: ext === "jpg" ? "jpeg" : ext });
  }

  const active = new Set<number>();
  const blocks: Block[] = [];
  for (const m of body.matchAll(BLOCK_RE)) {
    blocks.push(m[0].startsWith("<w:tbl>") ? parseTable(m[0], media, active) : parsePara(m[0], media, active));
  }
  const paras = blocks.filter((b): b is Para => !isTable(b));

  // comentários
  const comments: DocComment[] = [];
  const cx = await zip.file("word/comments.xml")?.async("string");
  if (cx) {
    for (const m of cx.matchAll(/<w:comment [^>]*>[\s\S]*?<\/w:comment>/g)) {
      const head = m[0].match(/<w:comment ([^>]*)>/)![1];
      const a = attrs(head);
      const text = [...m[0].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((x) => unesc(x[1])).join("");
      comments.push({ id: Number(a.id), author: unesc(a.author ?? ""), date: a.date ?? "", text });
    }
  }

  const sect = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";
  const pg = (tag: string, a: string, d: number) => Number(sect.match(new RegExp(`<w:${tag}[^>]*w:${a}="(\\d+)"`))?.[1] ?? d) / 15;
  const page: PageData = {
    w: pg("pgSz", "w", 11909), h: pg("pgSz", "h", 16834),
    top: pg("pgMar", "top", 1440), bottom: pg("pgMar", "bottom", 1440),
    left: pg("pgMar", "left", 1440), right: pg("pgMar", "right", 1440),
  };
  const headerDist = pg("pgMar", "header", 720);

  // cabeçalho (imagem do NUPS/TJRO)
  let header: DocHeader = null;
  try {
    const hid = sect.match(/<w:headerReference[^>]*r:id="([^"]+)"/)?.[1];
    const hfile = hid && relOf(rels, hid);
    if (hfile) {
      const hxml = await zip.file(`word/${hfile}`)!.async("string");
      const hrels = await zip.file(`word/_rels/${hfile}.rels`)!.async("string");
      const emb = hxml.match(/r:embed="([^"]+)"/)?.[1];
      const target = emb && relOf(hrels, emb);
      const img = target && zip.file(`word/${target}`);
      if (img) {
        const ext = (target.split(".").pop() ?? "jpeg").toLowerCase().replace("jpg", "jpeg");
        const b64 = await img.async("base64");
        const num = (re: RegExp, d = 0) => Number(hxml.match(re)?.[1] ?? d);
        const src = hxml.match(/<a:srcRect([^>]*)\/>/)?.[1] ?? "";
        const c = (k: string) => Number(src.match(new RegExp(`${k}="(-?\\d+)"`))?.[1] ?? 0) / 100000;
        const rel = num(/<wp:positionH[\s\S]*?<wp:posOffset>(-?\d+)</) / 9525;
        header = {
          src: `data:image/${ext};base64,${b64}`,
          x: page.left + rel, rel,
          y: headerDist + num(/<wp:positionV[\s\S]*?<wp:posOffset>(-?\d+)</) / 9525,
          w: num(/<wp:extent cx="(\d+)"/) / 9525,
          h: num(/<wp:extent cx="\d+" cy="(\d+)"/) / 9525,
          crop: { l: c("l"), r: c("r"), t: c("t"), b: c("b") },
        };
      }
    }
  } catch { header = null; }

  return { blocks, paras, comments, page, header };
}

// ---------- gravação ----------

const rfonts = (f: string) => `<w:rFonts w:ascii="${esc(f)}" w:cs="${esc(f)}" w:eastAsia="${esc(f)}" w:hAnsi="${esc(f)}"/>`;
const NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";

type Ctx = {
  open: Set<number>;                 // comentários com trecho aberto
  rid: (img: ImgData) => string;     // id da relação da imagem
  docPr: number;
};

function closeComments(ctx: Ctx, keep: Set<number>): string {
  let out = "";
  for (const id of [...ctx.open]) {
    if (keep.has(id)) continue;
    ctx.open.delete(id);
    out += `<w:commentRangeEnd w:id="${id}"/><w:r><w:commentReference w:id="${id}"/></w:r>`;
  }
  return out;
}

function paraXml(p: Para, ctx: Ctx): string {
  const attr = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => ` w:${k}="${esc(v)}"`).join("");
  const sp = Object.keys(p.sp).length ? `<w:spacing${attr(p.sp)}/>` : "";
  const ind = Object.keys(p.ind).length ? `<w:ind${attr(p.ind)}/>` : "";
  const jc = p.jc ? `<w:jc w:val="${p.jc}"/>` : "";
  const mark = `<w:rPr>${rfonts(p.font)}<w:sz w:val="${p.sz}"/><w:szCs w:val="${p.sz}"/></w:rPr>`;
  let body = "";

  if (p.img) {
    const cx = Math.round(p.img.w * 9525), cy = Math.round(p.img.h * 9525);
    const rid = ctx.rid(p.img);
    const n = ++ctx.docPr;
    body += `<w:r><w:drawing><wp:inline xmlns:wp="${NS_WP}" distT="0" distB="0" distL="0" distR="0">`
      + `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Imagem ${n}"/>`
      + `<a:graphic xmlns:a="${NS_A}"><a:graphicData uri="${NS_PIC}">`
      + `<pic:pic xmlns:pic="${NS_PIC}"><pic:nvPicPr><pic:cNvPr id="${n}" name="Imagem ${n}"/><pic:cNvPicPr/></pic:nvPicPr>`
      + `<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
      + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
      + `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }

  for (const r of p.runs.filter((x) => x.t !== "")) {
    const cms = new Set(r.cm ?? []);
    body += closeComments(ctx, cms);
    for (const id of cms) if (!ctx.open.has(id)) { ctx.open.add(id); body += `<w:commentRangeStart w:id="${id}"/>`; }
    const f = r.f ?? p.font;
    const rpr = `<w:rPr>${rfonts(f)}${r.b ? "<w:b/><w:bCs/>" : ""}${r.i ? "<w:i/><w:iCs/>" : ""}`
      + `${r.c ? `<w:color w:val="${r.c}"/>` : ""}<w:sz w:val="${r.sz}"/><w:szCs w:val="${r.sz}"/>${r.u ? '<w:u w:val="single"/>' : ""}</w:rPr>`;
    const parts = r.t.split(/(\n|\t)/).map((s) =>
      s === "\n" ? "<w:br/>" : s === "\t" ? "<w:tab/>" : s ? `<w:t xml:space="preserve">${esc(s)}</w:t>` : "").join("");
    body += `<w:r>${rpr}${parts}</w:r>`;
  }
  body += closeComments(ctx, new Set()); // comentários não atravessam parágrafos
  return `<w:p><w:pPr>${sp}${ind}${jc}${mark}</w:pPr>${body}</w:p>`;
}

function tableXml(t: TableBlock, ctx: Ctx, pageWidthTw: number): string {
  const cols = Math.max(1, ...t.rows.map((r) => r.length));
  const w = Math.floor(pageWidthTw / cols);
  const border = (n: string) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`;
  const rows = t.rows.map((r) => {
    const cells = Array.from({ length: cols }, (_, i) => r[i] ?? [emptyPara()]);
    return `<w:tr>${cells.map((c) =>
      `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${(c.length ? c : [emptyPara()]).map((p) => paraXml(p, ctx)).join("")}</w:tc>`).join("")}</w:tr>`;
  }).join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="${w * cols}" w:type="dxa"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders>`
    + `<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>`
    + `<w:tblGrid>${Array.from({ length: cols }, () => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${rows}</w:tbl>`;
}

export const emptyPara = (): Para => ({ sp: { line: "276", lineRule: "auto" }, ind: {}, sz: 24, font: "Times New Roman", runs: [] });

// Troca o conteúdo do documento pelo editado, preservando cabeçalho, página e estilos do arquivo.
export async function serializeDocx(
  buf: Buffer, blocks: Block[], opts: { comments?: DocComment[]; page?: Partial<PageData> } = {},
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  const start = xml.indexOf("<w:body>") + "<w:body>".length;
  let sect = xml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? "";

  // margens
  if (opts.page) {
    const tw = (px?: number) => (px === undefined ? undefined : Math.round(px * 15));
    const set = (k: string, v?: number) => { if (v !== undefined) sect = sect.replace(new RegExp(`(<w:pgMar[^>]*w:${k}=")\\d+"`), `$1${v}"`); };
    set("top", tw(opts.page.top)); set("bottom", tw(opts.page.bottom)); set("left", tw(opts.page.left)); set("right", tw(opts.page.right));
  }
  const pw = Number(sect.match(/<w:pgSz[^>]*w:w="(\d+)"/)?.[1] ?? 11909);
  const ml = Number(sect.match(/<w:pgMar[^>]*w:left="(\d+)"/)?.[1] ?? 1440);
  const mr = Number(sect.match(/<w:pgMar[^>]*w:right="(\d+)"/)?.[1] ?? 1440);
  const contentW = pw - ml - mr;

  // relações (imagens e comentários)
  const relsPath = "word/_rels/document.xml.rels";
  let rels = (await zip.file(relsPath)?.async("string")) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  let nextRid = Math.max(100, ...ids) + 1;
  let ct = await zip.file("[Content_Types].xml")!.async("string");
  const addDefault = (ext: string, type: string) => {
    if (!new RegExp(`<Default[^>]*Extension="${ext}"`, "i").test(ct)) ct = ct.replace("</Types>", `<Default Extension="${ext}" ContentType="${type}"/></Types>`);
  };
  let mediaN = 0;
  const known = new Set([...rels.matchAll(/Id="(rId\d+)"/g)].map((m) => m[1]));
  const ctx: Ctx = {
    open: new Set(), docPr: 100,
    rid: (img) => {
      // imagem que já estava no arquivo e não mudou: reaproveita a relação
      if (img.rid && known.has(img.rid)) return img.rid;
      const m = img.src.match(/^data:image\/(png|jpeg|gif);base64,(.+)$/);
      const ext = m ? (m[1] === "jpeg" ? "jpg" : m[1]) : "png";
      const id = `rId${nextRid++}`;
      const name = `nups_${Date.now().toString(36)}_${++mediaN}.${ext}`;
      zip.file(`word/media/${name}`, m ? m[2] : "", { base64: true });
      addDefault(ext, mime(ext));
      rels = rels.replace("</Relationships>", `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/></Relationships>`);
      img.rid = id; known.add(id);
      return id;
    },
  };

  const body = blocks.map((b) => (isTable(b) ? tableXml(b, ctx, contentW) : paraXml(b, ctx))).join("");
  const endsWithTable = blocks.length > 0 && isTable(blocks[blocks.length - 1]);
  const out = `${xml.slice(0, start)}${body}${endsWithTable ? paraXml(emptyPara(), ctx) : ""}${sect}</w:body></w:document>`;
  zip.file("word/document.xml", out);

  // comentários
  const comments = opts.comments ?? [];
  if (comments.length) {
    const cxml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`
      + comments.map((c) => `<w:comment w:id="${c.id}" w:author="${esc(c.author)}" w:date="${esc(c.date)}" w:initials="${esc(c.author.split(" ").map((s) => s[0]).join("").slice(0, 3))}">`
        + c.text.split(/\n/).map((l) => `<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`).join("") + `</w:comment>`).join("")
      + `</w:comments>`;
    zip.file("word/comments.xml", cxml);
    if (!/relationships\/comments"/.test(rels)) {
      rels = rels.replace("</Relationships>", `<Relationship Id="rId${nextRid++}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>`);
    }
    if (!/PartName="\/word\/comments\.xml"/.test(ct)) {
      ct = ct.replace("</Types>", `<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>`);
    }
  }
  zip.file(relsPath, rels);
  zip.file("[Content_Types].xml", ct);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// ---------- validação do que vem do navegador ----------

const IMG_RE = /^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/;
const num = (v: unknown, d: number, lo = 2, hi = 400) => (typeof v === "number" && isFinite(v) ? Math.min(Math.max(Math.round(v), lo), hi) : d);
const rec = (v: unknown) => Object.fromEntries(
  Object.entries((v && typeof v === "object" ? v : {}) as Record<string, unknown>)
    .filter(([k, x]) => /^\w+$/.test(k) && typeof x === "string" && /^-?\d+$|^auto$/.test(x as string)) as [string, string][],
);

function cleanPara(p: unknown): Para {
  const o = (p ?? {}) as Record<string, unknown>;
  const jc = ["left", "center", "right", "both"].includes(o.jc as string) ? (o.jc as Para["jc"]) : undefined;
  const runs = (Array.isArray(o.runs) ? o.runs : []).slice(0, 800).map((r) => {
    const x = (r ?? {}) as Record<string, unknown>;
    const f = typeof x.f === "string" && /^[\w \-]{1,40}$/.test(x.f) ? x.f : undefined;
    const c = typeof x.c === "string" && /^[0-9A-Fa-f]{6}$/.test(x.c) ? x.c.toUpperCase() : undefined;
    const cm = Array.isArray(x.cm) ? x.cm.filter((n) => Number.isInteger(n) && n >= 0).slice(0, 10) as number[] : undefined;
    return {
      t: String(x.t ?? "").slice(0, 50000),
      b: x.b ? true : undefined, i: x.i ? true : undefined, u: x.u ? true : undefined,
      sz: num(x.sz, 24), ...(f ? { f } : {}), ...(c ? { c } : {}), ...(cm?.length ? { cm } : {}),
    } satisfies Run;
  });
  const font = typeof o.font === "string" && /^[\w \-]{1,40}$/.test(o.font) ? o.font : "Times New Roman";
  const im = o.img as Record<string, unknown> | undefined;
  const img: ImgData | undefined = im && typeof im.src === "string" && IMG_RE.test(im.src) && im.src.length < 8_000_000
    ? { src: im.src, ext: String(im.ext ?? "png"), w: num(im.w, 200, 8, 2000), h: num(im.h, 150, 8, 4000), ...(typeof im.rid === "string" && /^rId\d+$/.test(im.rid) ? { rid: im.rid } : {}) }
    : undefined;
  return { jc, sp: rec(o.sp), ind: rec(o.ind), sz: num(o.sz, 24), font, runs, ...(img ? { img } : {}) };
}

export function cleanBlocks(input: unknown): Block[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 3000) return null;
  return input.map((b) => {
    const o = (b ?? {}) as Record<string, unknown>;
    if (o.kind === "table" && Array.isArray(o.rows)) {
      const rows = o.rows.slice(0, 200).map((r) =>
        (Array.isArray(r) ? r : []).slice(0, 20).map((c) => (Array.isArray(c) ? c : []).slice(0, 100).map(cleanPara)));
      return { kind: "table", rows } satisfies TableBlock;
    }
    return cleanPara(o);
  });
}

export function cleanComments(input: unknown): DocComment[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 500).map((c) => {
    const o = (c ?? {}) as Record<string, unknown>;
    return {
      id: num(o.id, 0, 0, 1_000_000),
      author: String(o.author ?? "").slice(0, 80),
      date: String(o.date ?? "").slice(0, 40),
      text: String(o.text ?? "").slice(0, 3000),
    };
  });
}

// compat: validação só de parágrafos
export function cleanParas(input: unknown): Para[] | null {
  const b = cleanBlocks(input);
  return b ? b.filter((x): x is Para => !isTable(x)) : null;
}
