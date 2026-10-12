"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft, Bold, Check, Image as ImageIcon, IndentDecrease, IndentIncrease,
  Italic, Loader2, MessageSquarePlus, MessageSquareText, Plus, RotateCcw, Save, Table2, Trash2, Underline, X,
} from "lucide-react";
import { isTable, type Block, type DocComment, type DocData, type ImgData, type Para, type Run } from "@/lib/docxDoc";
import { resetDocument, saveDocument } from "@/app/(app)/cadastrados/[id]/documento/actions";

type Cell = { html: string; jc?: Para["jc"]; sp: Record<string, string>; ind: Record<string, string>; sz: number; font: string };
type PItem = { uid: number; kind: "p"; jc?: Para["jc"]; sp: Record<string, string>; ind: Record<string, string>; sz: number; font: string; html: string; img?: ImgData };
type TItem = { uid: number; kind: "t"; cells: Cell[][] };
type Item = PItem | TItem;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const FONTS = ["Times New Roman", "Arial", "Calibri", "Georgia", "Verdana", "Courier New"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];
const LINES = [{ v: "240", t: "1,0" }, { v: "276", t: "1,15" }, { v: "360", t: "1,5" }, { v: "480", t: "2,0" }];
const MARGINS = [
  { k: "normal", t: "Normal (2,5 cm)", px: 96 },
  { k: "estreita", t: "Estreita (1,3 cm)", px: 48 },
  { k: "larga", t: "Larga (3,8 cm)", px: 144 },
];
const HEADER_MIN_TOP = 133; // o cabeçalho do NUPS precisa desse espaço no topo

function runsHtml(runs: Run[], pfont: string): string {
  return runs.map((r) => {
    const st = `${r.b ? "font-weight:700;" : ""}${r.i ? "font-style:italic;" : ""}${r.u ? "text-decoration:underline;" : ""}`
      + `${r.f && r.f !== pfont ? `font-family:'${r.f}';` : ""}${r.c ? `color:#${r.c};` : ""}font-size:${r.sz / 2}pt`;
    const cm = r.cm?.length ? ` class="doc-cm" data-cm="${r.cm.join(",")}"` : "";
    return `<span${cm} style="${st}">${esc(r.t).replace(/\[preencher\]/g, '<mark class="doc-todo">[preencher]</mark>').replace(/\n/g, "<br>")}</span>`;
  }).join("");
}

function paraStyle(p: { sp: Record<string, string>; ind: Record<string, string>; jc?: Para["jc"]; font: string; sz: number }): CSSProperties {
  const n = (k: string) => (p.sp[k] ? Number(p.sp[k]) : 0);
  const line = p.sp.line ? Number(p.sp.line) / 240 : 1.15;
  return {
    margin: 0,
    marginTop: n("before") / 15, marginBottom: n("after") / 15,
    lineHeight: line * 1.15,
    textIndent: p.ind.firstLine ? Number(p.ind.firstLine) / 15 : p.ind.hanging ? -Number(p.ind.hanging) / 15 : 0,
    paddingLeft: p.ind.left ? Number(p.ind.left) / 15 : 0,
    paddingRight: p.ind.right ? Number(p.ind.right) / 15 : 0,
    textAlign: p.jc === "both" ? "justify" : p.jc ?? "left",
    fontFamily: `"${p.font}", "Times New Roman", Times, serif`,
    fontSize: `${p.sz / 2}pt`,
    minHeight: `${(p.sz / 2) * line * 1.15}pt`,
  };
}

const hexOf = (css: string) => {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return undefined;
  const h = [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase();
  return h === "000000" ? undefined : h;
};

// Lê o conteúdo editado e devolve os trechos com formatação (negrito, itálico, sublinhado, fonte, tamanho, cor, comentários).
function readRuns(el: HTMLElement, pfont: string): Run[] {
  const out: Run[] = [];
  const push = (t: string, host: Element) => {
    if (!t) return;
    const cs = getComputedStyle(host);
    const fam = cs.fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const cm: number[] = [];
    for (let n: Element | null = host; n && n !== el; n = n.parentElement) {
      const v = n.getAttribute("data-cm");
      if (v) v.split(",").forEach((x) => { const k = Number(x); if (Number.isInteger(k) && !cm.includes(k)) cm.push(k); });
    }
    const r: Run = {
      t,
      b: Number(cs.fontWeight) >= 600 || cs.fontWeight === "bold" || undefined,
      i: cs.fontStyle === "italic" || undefined,
      u: cs.textDecorationLine.includes("underline") || undefined,
      sz: Math.max(2, Math.round(parseFloat(cs.fontSize) * 1.5)),
      ...(fam && fam.toLowerCase() !== pfont.toLowerCase() ? { f: fam } : {}),
      ...(hexOf(cs.color) ? { c: hexOf(cs.color) } : {}),
      ...(cm.length ? { cm } : {}),
    };
    const last = out[out.length - 1];
    const same = last && !!last.b === !!r.b && !!last.i === !!r.i && !!last.u === !!r.u && last.sz === r.sz
      && last.f === r.f && last.c === r.c && (last.cm ?? []).join() === (r.cm ?? []).join();
    if (same) last.t += t; else out.push(r);
  };
  const walk = (node: Node, first: boolean) => {
    node.childNodes.forEach((c, idx) => {
      if (c.nodeType === Node.TEXT_NODE) push((c.textContent ?? "").replace(/​/g, ""), node as Element);
      else if (c.nodeType === Node.ELEMENT_NODE && (c as Element).classList.contains("pgspacer")) return;
      else if (c.nodeName === "BR") push("\n", node as Element);
      else if (c.nodeType === Node.ELEMENT_NODE) {
        if ((c.nodeName === "DIV" || c.nodeName === "P") && !(first && idx === 0)) push("\n", node as Element);
        walk(c, first && idx === 0);
      }
    });
  };
  walk(el, true);
  const last = out[out.length - 1];
  if (last && last.t.endsWith("\n")) last.t = last.t.slice(0, -1);
  return out.filter((r) => r.t !== "");
}

// Divide trechos em parágrafos nas quebras de linha (usado nas células de tabela).
function splitLines(runs: Run[]): Run[][] {
  const lines: Run[][] = [[]];
  const seen = new Set<number>();
  for (const r of runs) {
    r.t.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (!part) return;
      // um comentário não pode atravessar parágrafos: fica só no primeiro
      const cm = (r.cm ?? []).filter((id) => !seen.has(id) || lines[lines.length - 1].some((x) => x.cm?.includes(id)));
      cm.forEach((id) => seen.add(id));
      lines[lines.length - 1].push({ ...r, t: part, cm: cm.length ? cm : undefined });
    });
  }
  return lines;
}

let uidSeq = 1;
const GAP = 28; // vão cinza entre as páginas (px)

type Ref = { kind: "inicial" } | { kind: "acomp"; n: number } | { kind: "fisc" } | { kind: "nota" };

const toItem = (b: Block): Item => {
  if (isTable(b)) {
    return {
      uid: uidSeq++, kind: "t",
      cells: b.rows.map((row) => row.map((paras) => {
        const first = paras[0];
        return {
          html: paras.map((p) => runsHtml(p.runs, p.font)).join("<br>"),
          jc: first?.jc, sp: first?.sp ?? {}, ind: first?.ind ?? {}, sz: first?.sz ?? 24, font: first?.font ?? "Times New Roman",
        };
      })),
    };
  }
  return { uid: uidSeq++, kind: "p", jc: b.jc, sp: b.sp, ind: b.ind, sz: b.sz, font: b.font, html: runsHtml(b.runs, b.font), img: b.img };
};

export function DocEditor({ id, data, version, canEdit, docRef = { kind: "inicial" }, backHref = "/processos", author = "" }: {
  id: string; data: DocData; version: string; canEdit: boolean; docRef?: Ref; backHref?: string; author?: string;
}) {
  const [items, setItems] = useState<Item[]>(() => data.blocks.map(toItem));
  const [comments, setComments] = useState<DocComment[]>(data.comments);
  const [margins, setMargins] = useState({ top: data.page.top, bottom: data.page.bottom, left: data.page.left, right: data.page.right });
  const [active, setActive] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [tableBox, setTableBox] = useState(false);
  const [tRows, setTRows] = useState(3);
  const [tCols, setTCols] = useState(3);
  const [composer, setComposer] = useState<{ text: string } | null>(null);
  const [activeCm, setActiveCm] = useState<number | null>(null);
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(true);
  const [avail, setAvail] = useState(0);
  const [pageH, setPageH] = useState(0);
  const [gaps, setGaps] = useState<number[]>([]);
  const base = useRef(version);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const focusNext = useRef<{ key: string; atStart: boolean } | null>(null);
  const savedSel = useRef<Range | null>(null);
  const pendingRange = useRef<Range | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // em telas estreitas a folha inteira é reduzida para caber na largura (ou rola, se a pessoa preferir 100%)
  useEffect(() => {
    const wrap = wrapRef.current, pg = pageRef.current;
    if (!wrap || !pg) return;
    const ro = new ResizeObserver(() => { setAvail(wrap.clientWidth); setPageH(pg.offsetHeight); });
    ro.observe(wrap); ro.observe(pg);
    setAvail(wrap.clientWidth); setPageH(pg.offsetHeight);
    return () => ro.disconnect();
  }, []);
  const scale = fit && avail > 0 ? Math.min(1, avail / data.page.w) : 1;

  // guarda a seleção dentro do documento (os controles da barra tiram o foco do texto)
  useEffect(() => {
    const onSel = () => {
      const s = getSelection();
      if (!s || s.rangeCount === 0) return;
      const r = s.getRangeAt(0);
      if (pageRef.current?.contains(r.commonAncestorContainer)) savedSel.current = r.cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  useEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    focusNext.current = null;
    const el = refs.current.get(f.key);
    if (!el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(f.atStart);
    const s = getSelection();
    s?.removeAllRanges(); s?.addRange(r);
  });

  // Paginação: a cada página, margem inferior, um vão e a margem superior da próxima (como no Word).
  const composing = useRef(false);
  const raf = useRef(0);
  const paginate = () => {
    const page = pageRef.current;
    if (!page || composing.current) return;
    page.querySelectorAll(".pgspacer").forEach((n) => n.remove());
    const { h: pageH } = data.page;
    const mt = margins.top, mb = margins.bottom;
    const H = pageH - mt - mb;
    const sc = page.offsetWidth ? page.getBoundingClientRect().width / page.offsetWidth : 1; // escala visual da folha
    const origin = () => page.getBoundingClientRect().top + page.clientTop * sc;
    let limit = mt + H;
    const gapsOut: number[] = [];

    const lineStart = (el: HTMLElement, after: Node | null, y: number): { node: Text; i: number } | null => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const rg = document.createRange();
      const topAt = (n: Text, i: number) => {
        rg.setStart(n, i); rg.setEnd(n, i + 1);
        const r = rg.getClientRects()[0];
        return r ? (r.top - origin()) / sc : null;
      };
      let seen = after === null;
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        if (!seen) { if (after!.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) seen = true; else continue; }
        const len = n.data.length;
        if (!len) continue;
        const last = topAt(n, len - 1);
        if (last === null || last < y - 1) continue;
        let lo = 0, hi = len - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          const t = topAt(n, mid);
          if (t !== null && t >= y - 1) hi = mid; else lo = mid + 1;
        }
        return { node: n, i: lo };
      }
      return null;
    };

    const blocks = [...page.children].filter((c) => c.classList.contains("doc-para") || c.classList.contains("doc-table-wrap")) as HTMLElement[];
    for (const el of blocks) {
      let spacer: HTMLElement | null = null;
      const unsplit = el.classList.contains("doc-table-wrap") || el.classList.contains("doc-img");
      for (let guard = 0; guard < 40; guard++) {
        const bottom = el.offsetTop + el.offsetHeight;
        if (bottom <= limit + 0.5) break;

        if (unsplit) {
          // tabela e imagem não se dividem: vão inteiro para a página seguinte
          const top = el.offsetTop;
          if (top <= limit - H + 1) break; // já abre a página: não cabe em nenhuma, deixa passar
          const sp = document.createElement("div");
          sp.className = "pgspacer";
          sp.style.cssText = `height:${limit - top + mb + GAP + mt}px;`;
          el.parentNode!.insertBefore(sp, el);
          gapsOut.push(limit + mb);
          limit = limit + mb + GAP + mt + H;
          continue;
        }

        const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
        const top = spacer ? (spacer.getBoundingClientRect().bottom - origin()) / sc : el.offsetTop;
        const total = Math.max(1, Math.round((bottom - top) / lh));
        let fit = Math.max(0, Math.floor((limit - top + 0.5) / lh));
        if (fit < total) {
          if (total - fit === 1 && fit >= 3) fit -= 1;
          if (!spacer && fit < 2) fit = 0;
        }
        const y = top + fit * lh;
        const sh = limit - y + mb + GAP + mt;
        const sp = document.createElement("span");
        sp.className = "pgspacer";
        sp.contentEditable = "false";
        sp.style.cssText = `display:block;height:${sh}px;`;
        if (fit === 0 && !spacer) el.insertBefore(sp, el.firstChild);
        else {
          const at = lineStart(el, spacer, y);
          if (!at) break;
          if (at.i > 0) at.node.splitText(at.i);
          const ref = at.i > 0 ? at.node.nextSibling! : at.node;
          ref.parentNode!.insertBefore(sp, ref);
        }
        gapsOut.push(limit + mb);
        limit = limit + mb + GAP + mt + H;
        spacer = sp;
      }
    }
    setGaps((cur) => (cur.length === gapsOut.length && cur.every((v, i) => v === gapsOut[i]) ? cur : gapsOut));
  };
  const schedule = () => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(paginate);
  };
  const clearSpacers = () => pageRef.current?.querySelectorAll(".pgspacer").forEach((n) => n.remove());
  useEffect(() => {
    paginate();
    void document.fonts?.ready.then(paginate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, margins]);

  const touch = () => { setDirty(true); setMsg(null); schedule(); };
  const idxOf = (uid: number) => items.findIndex((x) => x.uid === uid);
  const key = (uid: number) => `p${uid}`;
  const ckey = (uid: number, r: number, c: number) => `t${uid}:${r}:${c}`;

  // volta a seleção do texto depois de usar um campo da barra
  const restoreSel = () => {
    const r = savedSel.current;
    if (!r) return false;
    const s = getSelection();
    s?.removeAllRanges(); s?.addRange(r);
    return true;
  };

  function exec(cmd: string, val?: string) {
    if (!canEdit) return;
    restoreSel();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
    touch();
  }
  function setSize(pt: number) {
    if (!canEdit) return;
    restoreSel();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    pageRef.current?.querySelectorAll<HTMLElement>('font[size="7"], span[style*="xxx-large"]').forEach((el) => {
      el.removeAttribute("size");
      el.style.fontSize = `${pt}pt`;
    });
    touch();
  }

  const activeItem = items.find((x) => x.uid === active);
  function patchPara(patch: Partial<Pick<PItem, "jc" | "sp" | "ind">>) {
    if (!canEdit || active === null) return;
    setItems((cur) => cur.map((x) => (x.uid === active && x.kind === "p" ? { ...x, ...patch } : x)));
    touch();
  }
  const align = (jc: Para["jc"]) => patchPara({ jc });
  const setLine = (v: string) => activeItem?.kind === "p" && patchPara({ sp: { ...activeItem.sp, line: v, lineRule: "auto" } });
  const setAfter = (v: string) => activeItem?.kind === "p" && patchPara({ sp: { ...activeItem.sp, after: v } });
  const indent = (delta: number) => {
    if (activeItem?.kind !== "p") return;
    const cur = Number(activeItem.ind.left ?? 0);
    patchPara({ ind: { ...activeItem.ind, left: String(Math.max(0, cur + delta)) } });
  };
  const firstLine = () => {
    if (activeItem?.kind !== "p") return;
    const has = Number(activeItem.ind.firstLine ?? 0) > 0;
    const ind = { ...activeItem.ind };
    if (has) delete ind.firstLine; else ind.firstLine = "720";
    patchPara({ ind });
  };

  function insertAfter(it: Item) {
    const at = active === null ? items.length - 1 : idxOf(active);
    setItems((cur) => [...cur.slice(0, at + 1), it, ...cur.slice(at + 1)]);
    setActive(it.uid);
    touch();
  }
  function addAfter() {
    if (!canEdit) return;
    const src = (activeItem?.kind === "p" ? activeItem : items.find((x): x is PItem => x.kind === "p")) ?? null;
    const n: PItem = { uid: uidSeq++, kind: "p", jc: src?.jc, sp: src?.sp ?? { line: "276", lineRule: "auto" }, ind: src?.ind ?? {}, sz: src?.sz ?? 24, font: src?.font ?? "Times New Roman", html: "" };
    insertAfter(n);
    focusNext.current = { key: key(n.uid), atStart: true };
  }
  function removeActive() {
    if (!canEdit || active === null || items.length < 2) return;
    clearSpacers();
    const at = idxOf(active);
    const next = items[at + 1] ?? items[at - 1];
    setItems((cur) => cur.filter((x) => x.uid !== active));
    setActive(next.uid);
    touch();
  }

  // ----- tabelas -----
  function insertTable() {
    const r = Math.min(Math.max(tRows, 1), 20), c = Math.min(Math.max(tCols, 1), 8);
    const cell: Cell = { html: "", sp: { line: "276", lineRule: "auto" }, ind: {}, sz: 24, font: "Times New Roman" };
    insertAfter({ uid: uidSeq++, kind: "t", cells: Array.from({ length: r }, () => Array.from({ length: c }, () => ({ ...cell }))) });
    setTableBox(false);
  }
  function snapshot(t: TItem): Cell[][] {
    return t.cells.map((row, r) => row.map((c, ci) => ({ ...c, html: refs.current.get(ckey(t.uid, r, ci))?.innerHTML ?? c.html })));
  }
  function tableOp(op: "row" | "col" | "del") {
    const t = activeItem;
    if (!canEdit || !t || t.kind !== "t") return;
    clearSpacers();
    const cells = snapshot(t);
    if (op === "del") { setItems((cur) => cur.filter((x) => x.uid !== t.uid)); setActive(null); touch(); return; }
    const proto = cells[0][0];
    const blank = { ...proto, html: "" };
    const next = op === "row" ? [...cells, cells[0].map(() => ({ ...blank }))] : cells.map((r) => [...r, { ...blank }]);
    setItems((cur) => cur.map((x) => (x.uid === t.uid ? { ...t, cells: next } : x)));
    touch();
  }

  // ----- imagens -----
  async function onImage(file?: File) {
    if (!file || !canEdit) return;
    if (!/^image\/(png|jpeg|gif)$/.test(file.type)) { setMsg({ ok: false, text: "Use uma imagem PNG, JPG ou GIF." }); return; }
    const bmp = await createImageBitmap(file);
    const maxW = 1000;
    const scale = Math.min(1, maxW / bmp.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const png = file.type !== "image/jpeg";
    const src = canvas.toDataURL(png ? "image/png" : "image/jpeg", 0.88);
    const contentW = data.page.w - margins.left - margins.right;
    const w = Math.min(canvas.width, contentW);
    const h = Math.round(canvas.height * (w / canvas.width));
    insertAfter({
      uid: uidSeq++, kind: "p", sp: { line: "240", lineRule: "auto" }, ind: {}, sz: 24, font: "Times New Roman", html: "",
      img: { src, ext: png ? "png" : "jpeg", w, h },
    });
  }

  // ----- comentários -----
  function startComment() {
    const r = savedSel.current;
    if (!canEdit || !r || r.collapsed || !pageRef.current?.contains(r.commonAncestorContainer)) {
      setMsg({ ok: false, text: "Selecione um trecho do texto para comentar." });
      return;
    }
    // o trecho precisa estar num único parágrafo (ou célula)
    const host = (n: Node) => (n.nodeType === 1 ? (n as Element) : n.parentElement)?.closest("[contenteditable='true']");
    if (!host(r.startContainer) || host(r.startContainer) !== host(r.endContainer)) {
      setMsg({ ok: false, text: "Comente um trecho dentro de um mesmo parágrafo." });
      return;
    }
    pendingRange.current = r.cloneRange();
    setComposer({ text: "" });
  }
  function addComment() {
    const r = pendingRange.current;
    if (!r || !composer || !composer.text.trim()) return;
    const nextId = Math.max(0, ...comments.map((c) => c.id)) + 1;
    clearSpacers();
    const span = document.createElement("span");
    span.className = "doc-cm";
    span.setAttribute("data-cm", String(nextId));
    span.appendChild(r.extractContents());
    r.insertNode(span);
    setComments((cur) => [...cur, { id: nextId, author: author || "Você", date: new Date().toISOString(), text: composer.text.trim() }]);
    setComposer(null);
    pendingRange.current = null;
    setActiveCm(nextId);
    touch();
  }
  function removeComment(cid: number) {
    clearSpacers();
    pageRef.current?.querySelectorAll<HTMLElement>(`[data-cm]`).forEach((el) => {
      const ids = (el.getAttribute("data-cm") ?? "").split(",").filter((x) => Number(x) !== cid);
      if (ids.length) el.setAttribute("data-cm", ids.join(","));
      else { el.removeAttribute("data-cm"); el.classList.remove("doc-cm"); }
    });
    setComments((cur) => cur.filter((c) => c.id !== cid));
    touch();
  }
  function goComment(cid: number) {
    setActiveCm(cid);
    pageRef.current?.querySelector(`[data-cm~="${cid}"], [data-cm="${cid}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  const quoteOf = (cid: number) => {
    const el = pageRef.current?.querySelector(`[data-cm="${cid}"], [data-cm^="${cid},"], [data-cm$=",${cid}"]`);
    return (el?.textContent ?? "").slice(0, 120);
  };

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>, it: PItem) {
    if (!canEdit) return;
    const el = e.currentTarget;
    if (it.img) {
      if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); removeActive(); }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      clearSpacers();
      const sel = getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      r.deleteContents();
      const tail = document.createRange();
      tail.selectNodeContents(el);
      tail.setStart(r.endContainer, r.endOffset);
      const frag = tail.extractContents();
      const box = document.createElement("div");
      box.appendChild(frag);
      const n: PItem = { ...it, uid: uidSeq++, html: box.innerHTML, img: undefined };
      setItems((cur) => {
        const at = cur.findIndex((x) => x.uid === it.uid);
        return [...cur.slice(0, at + 1), n, ...cur.slice(at + 1)];
      });
      focusNext.current = { key: key(n.uid), atStart: true };
      touch();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      document.execCommand("insertLineBreak");
      touch();
    } else if (e.key === "Backspace") {
      const sel = getSelection();
      if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return;
      const pre = document.createRange();
      pre.selectNodeContents(el);
      pre.setEnd(sel.anchorNode!, sel.anchorOffset);
      if (pre.toString() !== "" || pre.cloneContents().querySelector("br")) return;
      const at = idxOf(it.uid);
      if (at <= 0) return;
      const prev = items[at - 1];
      if (prev.kind !== "p" || prev.img) return;
      e.preventDefault();
      clearSpacers();
      const prevEl = refs.current.get(key(prev.uid));
      if (!prevEl) return;
      prevEl.insertAdjacentHTML("beforeend", el.innerHTML);
      const merged = prevEl.innerHTML;
      setItems((cur) => cur.filter((x) => x.uid !== it.uid).map((x) => (x.uid === prev.uid ? { ...prev, html: merged } : x)));
      focusNext.current = { key: key(prev.uid), atStart: false };
      setActive(prev.uid);
      touch();
    }
  }

  function onPaste(e: React.ClipboardEvent) {
    if (!canEdit) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\r/g, "");
    document.execCommand("insertText", false, text);
    touch();
  }

  function collect(): { blocks: Block[]; comments: DocComment[] } {
    const used = new Set<number>();
    const grab = (el: HTMLElement | undefined, font: string) => {
      const runs = el ? readRuns(el, font) : [];
      runs.forEach((r) => r.cm?.forEach((c) => used.add(c)));
      return runs;
    };
    const blocks = items.map((it): Block => {
      if (it.kind === "p") {
        return { jc: it.jc, sp: it.sp, ind: it.ind, sz: it.sz, font: it.font, runs: it.img ? [] : grab(refs.current.get(key(it.uid)), it.font), ...(it.img ? { img: it.img } : {}) };
      }
      return {
        kind: "table",
        rows: it.cells.map((row, r) => row.map((c, ci) => {
          const lines = splitLines(grab(refs.current.get(ckey(it.uid, r, ci)), c.font));
          return lines.map((runs): Para => ({ jc: c.jc, sp: c.sp, ind: c.ind, sz: c.sz, font: c.font, runs }));
        })),
      };
    });
    return { blocks, comments: comments.filter((c) => used.has(c.id)) };
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = { ...collect(), page: margins };
      const r = await saveDocument(id, payload, base.current, docRef);
      if (r.ok) {
        setDirty(false);
        if (r.version) base.current = r.version;
        if (docRef.kind === "nota") { setMsg({ ok: true, text: "Nota salva." }); setBusy(false); return; } // a nota continua aberta
        router.push(backHref);
        return;
      }
      setMsg({ ok: r.ok, text: r.msg });
    } catch {
      setMsg({ ok: false, text: "Não foi possível salvar. Tente de novo." });
    }
    setBusy(false);
  }

  async function reset() {
    setBusy(true);
    const r = await resetDocument(id, docRef);
    if (r.ok) { window.location.reload(); return; }
    setMsg({ ok: false, text: r.msg });
    setBusy(false);
  }

  const { page, header } = data;
  const hw = header ? header.w / (1 - header.crop.l - header.crop.r) : 0;
  const hh = header ? header.h / (1 - header.crop.t - header.crop.b) : 0;
  const hx = header ? margins.left + header.rel : 0;
  const preventFocus = (e: React.MouseEvent) => e.preventDefault();
  const marginKey = MARGINS.find((m) => m.px === margins.left && m.px === margins.right)?.k ?? "normal";
  const resetLabel = docRef.kind === "acomp" ? "Refazer do modelo" : docRef.kind === "fisc" ? "Refazer das respostas" : docRef.kind === "nota" ? "Limpar nota" : "Refazer do cadastro";

  const headerBox = (top: number, k: string) => header && (
    <div key={k} style={{ position: "absolute", left: hx, top, width: header.w, height: header.h, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={header.src} alt="" style={{ position: "absolute", width: hw, height: hh, maxWidth: "none", left: -header.crop.l * hw, top: -header.crop.t * hh }} />
    </div>
  );

  return (
    <div className="doc-wrap">
      <div className="doc-bar">
        {docRef.kind !== "nota" && (confirmLeave ? (
          <>
            <span style={{ fontSize: 13 }}>Há alterações não salvas. Sair mesmo assim?</span>
            <button className="danger" onClick={() => { setDirty(false); router.push(backHref); }}>Sair sem salvar</button>
            <button className="ghost" onClick={() => setConfirmLeave(false)}>Continuar editando</button>
          </>
        ) : (
          <button className="ghost" onClick={() => (dirty ? setConfirmLeave(true) : router.push(backHref))}>
            <ArrowLeft size={16} /> Voltar
          </button>
        ))}
        {canEdit && (<>
          {docRef.kind !== "nota" && <span className="doc-sep" />}
          {confirmReset ? (
            <>
              <span style={{ fontSize: 13 }}>Descartar o que foi editado e refazer?</span>
              <button className="danger" disabled={busy} onClick={reset}>Sim, refazer</button>
              <button className="ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
            </>
          ) : (
            <button className="ghost" disabled={busy} onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> {resetLabel}
            </button>
          )}
          <button disabled={busy || !dirty} onClick={save}>
            {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Salvar
          </button>
          <span className="doc-grow" />
          {msg && (
            <span className={msg.ok ? "doc-ok" : "error"} style={{ fontSize: 13 }}>
              {msg.ok && <Check size={14} style={{ verticalAlign: "-2px" }} />} {msg.text}
            </span>
          )}
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{gaps.length + 1} {gaps.length ? "páginas" : "página"}</span>
          {avail > 0 && avail < page.w && (
            <button className="ghost" onClick={() => setFit((v) => !v)}>{fit ? "Tamanho real" : "Ajustar à tela"}</button>
          )}
          {dirty && !msg && <span style={{ color: "var(--muted)", fontSize: 13 }}>Alterações não salvas</span>}
        </>)}
        {!canEdit && <span style={{ color: "var(--muted)", fontSize: 13 }}>Você pode ver este documento, mas não editar.</span>}

        {canEdit && (
          <div className="doc-tools">
            <select title="Fonte" defaultValue="" onChange={(e) => { if (e.target.value) exec("fontName", e.target.value); e.target.value = ""; }}>
              <option value="" disabled>Fonte</option>
              {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
            <select title="Tamanho da letra" defaultValue="" onChange={(e) => { if (e.target.value) setSize(Number(e.target.value)); e.target.value = ""; }}>
              <option value="" disabled>Tam.</option>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="ghost icon" title="Negrito" onMouseDown={preventFocus} onClick={() => exec("bold")}><Bold size={16} /></button>
            <button className="ghost icon" title="Itálico" onMouseDown={preventFocus} onClick={() => exec("italic")}><Italic size={16} /></button>
            <button className="ghost icon" title="Sublinhado" onMouseDown={preventFocus} onClick={() => exec("underline")}><Underline size={16} /></button>
            <label className="doc-color" title="Cor da letra">
              <span>A</span>
              <input type="color" defaultValue="#000000" onChange={(e) => exec("foreColor", e.target.value)} />
            </label>
            <span className="doc-sep" />
            <button className="ghost icon" title="Alinhar à esquerda" onMouseDown={preventFocus} onClick={() => align("left")}><AlignLeft size={16} /></button>
            <button className="ghost icon" title="Centralizar" onMouseDown={preventFocus} onClick={() => align("center")}><AlignCenter size={16} /></button>
            <button className="ghost icon" title="Alinhar à direita" onMouseDown={preventFocus} onClick={() => align("right")}><AlignRight size={16} /></button>
            <button className="ghost icon" title="Justificar" onMouseDown={preventFocus} onClick={() => align("both")}><AlignJustify size={16} /></button>
            <select title="Espaçamento entre linhas" value={activeItem?.kind === "p" ? activeItem.sp.line ?? "276" : "276"} onChange={(e) => setLine(e.target.value)}>
              {LINES.map((l) => <option key={l.v} value={l.v}>Linhas {l.t}</option>)}
            </select>
            <select title="Espaço depois do parágrafo" value={activeItem?.kind === "p" ? activeItem.sp.after ?? "0" : "0"} onChange={(e) => setAfter(e.target.value)}>
              <option value="0">Depois: 0</option>
              <option value="120">Depois: 6 pt</option>
              <option value="240">Depois: 12 pt</option>
              <option value="360">Depois: 18 pt</option>
            </select>
            <button className="ghost icon" title="Diminuir recuo" onMouseDown={preventFocus} onClick={() => indent(-720)}><IndentDecrease size={16} /></button>
            <button className="ghost icon" title="Aumentar recuo" onMouseDown={preventFocus} onClick={() => indent(720)}><IndentIncrease size={16} /></button>
            <button className="ghost" title="Recuo da primeira linha" onMouseDown={preventFocus} onClick={firstLine}>1ª linha</button>
            <select title="Margens da página" value={marginKey} onChange={(e) => {
              const m = MARGINS.find((x) => x.k === e.target.value)!;
              setMargins({ left: m.px, right: m.px, bottom: m.px, top: Math.max(m.px, header ? HEADER_MIN_TOP : m.px) });
              touch();
            }}>
              {MARGINS.map((m) => <option key={m.k} value={m.k}>Margens: {m.t}</option>)}
            </select>
            <span className="doc-sep" />
            <div className="doc-pop">
              <button className="ghost" title="Inserir tabela" onMouseDown={preventFocus} onClick={() => setTableBox((v) => !v)}><Table2 size={16} /> Tabela</button>
              {tableBox && (
                <div className="doc-pop-box">
                  <label>Linhas <input type="number" min={1} max={20} value={tRows} onChange={(e) => setTRows(Number(e.target.value))} /></label>
                  <label>Colunas <input type="number" min={1} max={8} value={tCols} onChange={(e) => setTCols(Number(e.target.value))} /></label>
                  <button onClick={insertTable}>Inserir</button>
                </div>
              )}
            </div>
            {activeItem?.kind === "t" && (
              <>
                <button className="ghost" onMouseDown={preventFocus} onClick={() => tableOp("row")}>+ Linha</button>
                <button className="ghost" onMouseDown={preventFocus} onClick={() => tableOp("col")}>+ Coluna</button>
                <button className="danger" onMouseDown={preventFocus} onClick={() => tableOp("del")}>Apagar tabela</button>
              </>
            )}
            <button className="ghost" title="Inserir imagem" onMouseDown={preventFocus} onClick={() => fileRef.current?.click()}><ImageIcon size={16} /> Imagem</button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" hidden onChange={(e) => { void onImage(e.target.files?.[0]); e.target.value = ""; }} />
            <button className="ghost" title="Comentar o trecho selecionado" onMouseDown={preventFocus} onClick={startComment}><MessageSquarePlus size={16} /> Comentar</button>
            <span className="doc-sep" />
            <button className="ghost icon" title="Novo parágrafo depois do atual" onMouseDown={preventFocus} onClick={addAfter}><Plus size={16} /></button>
            <button className="ghost icon" title="Apagar o bloco atual (parágrafo, imagem ou tabela)" onMouseDown={preventFocus} onClick={removeActive}><Trash2 size={16} /></button>
          </div>
        )}
      </div>

      <div className="doc-body">
        <div className="doc-scroll" ref={wrapRef}>
          <div style={{ width: page.w * scale, height: pageH ? pageH * scale : undefined, margin: scale < 1 ? "0" : "0 auto" }}>
          <div
            className={`doc-page${docRef.kind === "nota" ? " note-mode" : ""}`} ref={pageRef}
            onMouseDown={(e) => {
              // clicar no espaço em branco da folha leva o cursor para o fim do texto
              if (!canEdit || e.target !== pageRef.current) return;
              const last = [...items].reverse().find((x) => x.kind === "p" && !x.img);
              const el = last ? refs.current.get(key(last.uid)) : null;
              if (!el) return;
              e.preventDefault();
              el.focus();
              const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
              const s = getSelection(); s?.removeAllRanges(); s?.addRange(r);
            }}
            style={{ transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: "top left", margin: 0, width: page.w, minHeight: gaps.length ? gaps[gaps.length - 1] + GAP + page.h : page.h, padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px` }}
          >
            {headerBox(header?.y ?? 0, "h0")}
            {gaps.map((y, i) => (
              <div key={`g${i}`}>
                <div className="doc-gap" style={{ top: y, height: GAP }}><span>Página {i + 2}</span></div>
                {headerBox(y + GAP + (header?.y ?? 0), `h${i + 1}`)}
              </div>
            ))}
            {items.map((it) => {
              if (it.kind === "t") {
                return (
                  <div key={it.uid} className="doc-table-wrap" data-active={active === it.uid || undefined}>
                    <table className="doc-table">
                      <tbody>
                        {it.cells.map((row, r) => (
                          <tr key={r}>
                            {row.map((c, ci) => (
                              <td key={ci}>
                                <div
                                  ref={(el) => { const k = ckey(it.uid, r, ci); if (el) refs.current.set(k, el); else refs.current.delete(k); }}
                                  className="doc-cell"
                                  style={paraStyle(c)}
                                  contentEditable={canEdit} suppressContentEditableWarning spellCheck lang="pt-BR"
                                  onFocus={() => setActive(it.uid)}
                                  onInput={touch}
                                  onPaste={onPaste}
                                  dangerouslySetInnerHTML={{ __html: c.html }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (it.img) {
                return (
                  <div
                    key={it.uid} ref={(el) => { if (el) refs.current.set(key(it.uid), el); else refs.current.delete(key(it.uid)); }}
                    className="doc-para doc-img" style={{ ...paraStyle(it), minHeight: 0 }}
                    data-active={active === it.uid || undefined}
                    tabIndex={0} onFocus={() => setActive(it.uid)} onClick={() => setActive(it.uid)}
                    onKeyDown={(e) => onKeyDown(e, it)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.img.src} alt="" width={it.img.w} height={it.img.h} style={{ maxWidth: "100%", height: "auto" }} />
                  </div>
                );
              }
              return (
                <div
                  key={it.uid}
                  ref={(el) => { if (el) refs.current.set(key(it.uid), el); else refs.current.delete(key(it.uid)); }}
                  className="doc-para"
                  style={paraStyle(it)}
                  contentEditable={canEdit}
                  suppressContentEditableWarning
                  spellCheck
                  lang="pt-BR"
                  data-active={active === it.uid || undefined}
                  onFocus={() => setActive(it.uid)}
                  onInput={touch}
                  onCompositionStart={() => { composing.current = true; }}
                  onCompositionEnd={() => { composing.current = false; schedule(); }}
                  onKeyDown={(e) => onKeyDown(e, it)}
                  onPaste={onPaste}
                  onClick={(e) => {
                    const cm = (e.target as HTMLElement).closest("[data-cm]")?.getAttribute("data-cm");
                    if (cm) setActiveCm(Number(cm.split(",")[0]));
                  }}
                  dangerouslySetInnerHTML={{ __html: it.html }}
                />
              );
            })}
          </div>
          </div>
        </div>

        {(comments.length > 0 || composer) && (
          <aside className="doc-comments">
            <h3><MessageSquareText size={16} /> Comentários ({comments.length})</h3>
            {composer && (
              <div className="doc-comment new">
                <textarea
                  autoFocus rows={3} placeholder="Escreva o comentário..." value={composer.text}
                  onChange={(e) => setComposer({ text: e.target.value })}
                />
                <div className="row">
                  <button onClick={addComment} disabled={!composer.text.trim()}>Comentar</button>
                  <button className="ghost" onClick={() => { setComposer(null); pendingRange.current = null; }}>Cancelar</button>
                </div>
              </div>
            )}
            {comments.map((c) => (
              <div key={c.id} className={`doc-comment${activeCm === c.id ? " on" : ""}`} onClick={() => goComment(c.id)}>
                <div className="doc-comment-head">
                  <strong>{c.author || "—"}</strong>
                  <span>{c.date ? new Date(c.date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                  {canEdit && (
                    <button className="ghost icon" aria-label="Apagar comentário" onClick={(e) => { e.stopPropagation(); removeComment(c.id); }}><X size={14} /></button>
                  )}
                </div>
                {quoteOf(c.id) && <blockquote>{quoteOf(c.id)}</blockquote>}
                <p>{c.text}</p>
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
