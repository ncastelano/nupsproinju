import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from "pdf-lib";
import { isTable, type Block, type DocData, type Para, type Run } from "@/lib/docxDoc";

// Gera o PDF do documento (mesmo padrão do editor: cabeçalho do NUPS, margens, parágrafos, tabelas e imagens).
const PX = 0.75; // px -> pt

type FamilyKey = "times" | "helv" | "cour";
const family = (name: string): FamilyKey =>
  /courier|consolas|mono/i.test(name) ? "cour" : /arial|helvetica|calibri|verdana|tahoma|segoe/i.test(name) ? "helv" : "times";

type Fonts = Record<FamilyKey, Record<"r" | "b" | "i" | "bi", PDFFont>>;

async function loadFonts(pdf: PDFDocument): Promise<Fonts> {
  const f = (n: StandardFonts) => pdf.embedFont(n);
  return {
    times: { r: await f(StandardFonts.TimesRoman), b: await f(StandardFonts.TimesRomanBold), i: await f(StandardFonts.TimesRomanItalic), bi: await f(StandardFonts.TimesRomanBoldItalic) },
    helv: { r: await f(StandardFonts.Helvetica), b: await f(StandardFonts.HelveticaBold), i: await f(StandardFonts.HelveticaOblique), bi: await f(StandardFonts.HelveticaBoldOblique) },
    cour: { r: await f(StandardFonts.Courier), b: await f(StandardFonts.CourierBold), i: await f(StandardFonts.CourierOblique), bi: await f(StandardFonts.CourierBoldOblique) },
  };
}

const hex = (c?: string) => {
  if (!c || !/^[0-9A-Fa-f]{6}$/.test(c)) return rgb(0, 0, 0);
  return rgb(parseInt(c.slice(0, 2), 16) / 255, parseInt(c.slice(2, 4), 16) / 255, parseInt(c.slice(4, 6), 16) / 255);
};

type Word = { text: string; font: PDFFont; size: number; color: ReturnType<typeof rgb>; u: boolean; w: number; space: number };

function dataBytes(src: string): { bytes: Uint8Array; kind: "png" | "jpg" } | null {
  const m = src.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!m) return null;
  return { bytes: Uint8Array.from(Buffer.from(m[2], "base64")), kind: m[1] === "png" ? "png" : "jpg" };
}

export async function docToPdf(data: DocData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);
  const W = data.page.w * PX, H = data.page.h * PX;
  const ML = data.page.left * PX, MR = data.page.right * PX, MT = Math.max(data.page.top, data.header ? data.header.y + data.header.h + 12 : 0) * PX, MB = data.page.bottom * PX; // o texto começa depois do cabeçalho (como no Word)
  const contentW = W - ML - MR;

  // cabeçalho
  let headerImg: PDFImage | null = null;
  if (data.header) {
    const d = dataBytes(data.header.src);
    if (d) headerImg = d.kind === "png" ? await pdf.embedPng(d.bytes) : await pdf.embedJpg(d.bytes);
  }

  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = pdf.addPage([W, H]);
    if (headerImg && data.header) {
      const h = data.header, c = h.crop;
      const fw = h.w / (1 - c.l - c.r), fh = h.h / (1 - c.t - c.b); // imagem inteira (px)
      const x = (data.page.left + h.rel) * PX, top = h.y * PX;
      page.pushOperators(pushGraphicsState(), rectangle(x, H - top - h.h * PX, h.w * PX, h.h * PX), clip(), endPath());
      page.drawImage(headerImg, { x: x - c.l * fw * PX, y: H - top + c.t * fh * PX - fh * PX, width: fw * PX, height: fh * PX });
      page.pushOperators(popGraphicsState());
    }
    y = H - MT;
  };
  newPage();

  const toWords = (p: Para): Word[] => {
    const out: Word[] = [];
    for (const r of p.runs) {
      const fam = family(r.f ?? p.font);
      const font = fonts[fam][r.b && r.i ? "bi" : r.b ? "b" : r.i ? "i" : "r"];
      const size = (r.sz || p.sz) / 2;
      const text = r.t.replace(/\t/g, "    ");
      for (const part of text.split(/(\n)/)) {
        if (part === "\n") { out.push({ text: "\n", font, size, color: hex(r.c), u: false, w: 0, space: 0 }); continue; }
        for (const tok of part.split(/(\s+)/)) {
          if (!tok) continue;
          const safe = safeText(tok, font);
          const isSpace = /^\s+$/.test(tok);
          out.push({ text: isSpace ? " " : safe, font, size, color: hex(r.c), u: !!r.u, w: font.widthOfTextAtSize(isSpace ? " " : safe, size), space: isSpace ? 1 : 0 });
        }
      }
    }
    return out;
  };

  // desenha um parágrafo em [x, x+width] a partir do cursor; devolve o novo y
  const drawPara = (p: Para, x0: number, width: number, lim: number, newPg: () => void, getY: () => number, setY: (v: number) => void, getPage: () => PDFPage) => {
    const sp = (k: string) => (p.sp[k] ? Number(p.sp[k]) : 0);
    const before = (sp("before") / 20), after = (sp("after") / 20);
    const left = (p.ind.left ? Number(p.ind.left) : 0) / 20;
    const first = (p.ind.firstLine ? Number(p.ind.firstLine) : 0) / 20;
    const lineFactor = (p.sp.line ? Number(p.sp.line) / 240 : 1.15);
    const words = toWords(p);
    setY(getY() - before);

    // imagem
    if (p.img) {
      const d = dataBytes(p.img.src);
      if (d) {
        const w = Math.min(p.img.w * PX, width), h = (p.img.h * PX) * (w / (p.img.w * PX));
        if (getY() - h < lim) { newPg(); }
        const pic = d.kind === "png" ? pdf.embedPng(d.bytes) : pdf.embedJpg(d.bytes);
        return pic.then((img) => {
          const px = p.jc === "center" ? x0 + (width - w) / 2 : p.jc === "right" ? x0 + width - w : x0;
          getPage().drawImage(img, { x: px, y: getY() - h, width: w, height: h });
          setY(getY() - h - after);
        });
      }
    }

    const lines: Word[][] = [];
    let cur: Word[] = [], curW = 0;
    const avail0 = width - left - first;
    const availN = width - left;
    for (const w of words) {
      if (w.text === "\n") { lines.push(cur); cur = []; curW = 0; continue; }
      const avail = lines.length === 0 ? avail0 : availN;
      if (w.space && cur.length === 0) continue;
      if (curW + w.w > avail && cur.length > 0 && !w.space) {
        while (cur.length && cur[cur.length - 1].space) cur.pop();
        lines.push(cur); cur = []; curW = 0;
      }
      cur.push(w); curW += w.w;
    }
    while (cur.length && cur[cur.length - 1].space) cur.pop();
    lines.push(cur);

    const baseSize = Math.max(...words.map((w) => w.size), p.sz / 2);
    const lh = baseSize * 1.15 * lineFactor;
    lines.forEach((ln, li) => {
      if (getY() - lh < lim) newPg();
      const size = ln.length ? Math.max(...ln.map((w) => w.size)) : baseSize;
      const baseline = getY() - size;
      const indent = left + (li === 0 ? first : 0);
      const avail = width - indent;
      const total = ln.reduce((s, w) => s + w.w, 0);
      const gaps = ln.filter((w) => w.space).length;
      const justify = p.jc === "both" && li < lines.length - 1 && gaps > 0 && total < avail;
      const extra = justify ? (avail - total) / gaps : 0;
      let x = x0 + indent;
      if (!justify) {
        if (p.jc === "center") x += (avail - total) / 2;
        else if (p.jc === "right") x += avail - total;
      }
      for (const w of ln) {
        if (!w.space && w.text) {
          getPage().drawText(w.text, { x, y: baseline, size: w.size, font: w.font, color: w.color });
          if (w.u) getPage().drawLine({ start: { x, y: baseline - 1.5 }, end: { x: x + w.w, y: baseline - 1.5 }, thickness: 0.5, color: w.color });
        }
        x += w.w + (w.space ? extra : 0);
      }
      setY(getY() - lh);
    });
    setY(getY() - after);
    return undefined;
  };

  const drawParaMain = async (p: Para) => {
    const r = drawPara(p, ML, contentW, MB, newPage, () => y, (v) => { y = v; }, () => page);
    if (r) await r;
  };

  for (const b of data.blocks as Block[]) {
    if (!isTable(b)) { await drawParaMain(b); continue; }
    // tabela simples: colunas iguais, bordas finas
    const cols = Math.max(1, ...b.rows.map((r) => r.length));
    const cw = contentW / cols, pad = 4;
    for (const row of b.rows) {
      // altura da linha: mede cada célula num "passe seco"
      let rowH = 0;
      const heights = row.map((cell) => {
        let hh = pad * 2;
        for (const p of cell) {
          const words = toWords(p);
          const size = Math.max(...words.map((w) => w.size), p.sz / 2);
          let lines = 1, wsum = 0;
          for (const w of words) {
            if (w.text === "\n") { lines++; wsum = 0; continue; }
            if (wsum + w.w > cw - pad * 2 && wsum > 0 && !w.space) { lines++; wsum = 0; }
            wsum += w.w;
          }
          hh += lines * size * 1.15 * (p.sp.line ? Number(p.sp.line) / 240 : 1.15);
        }
        rowH = Math.max(rowH, hh);
        return hh;
      });
      void heights;
      if (y - rowH < MB) newPage();
      const top = y;
      for (let c = 0; c < cols; c++) {
        const x = ML + c * cw;
        page.drawRectangle({ x, y: top - rowH, width: cw, height: rowH, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5 });
        let cy = top - pad;
        for (const p of row[c] ?? []) {
          const r = drawPara(p, x + pad, cw - pad * 2, top - rowH, () => {}, () => cy, (v) => { cy = v; }, () => page);
          if (r) await r;
        }
      }
      y = top - rowH;
    }
    y -= 6;
  }

  return pdf.save();
}

function safeText(s: string, font: PDFFont): string {
  let out = "";
  for (const ch of s) {
    try { font.widthOfTextAtSize(ch, 10); out += ch; } catch { out += ch === "–" || ch === "—" ? "-" : "?"; }
  }
  return out;
}
