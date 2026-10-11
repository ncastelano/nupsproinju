"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, Italic, Loader2, Plus, RotateCcw, Save, Trash2, Underline,
} from "lucide-react";
import type { DocData, Para, Run } from "@/lib/docxDoc";
import { resetDocument, saveDocument } from "@/app/(app)/cadastrados/[id]/documento/actions";

type Item = Omit<Para, "runs"> & { uid: number; html: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function runsHtml(runs: Run[]): string {
  return runs.map((r) => {
    const st = `${r.b ? "font-weight:700;" : ""}${r.i ? "font-style:italic;" : ""}${r.u ? "text-decoration:underline;" : ""}font-size:${r.sz / 2}pt`;
    return `<span style="${st}">${esc(r.t).replace(/\n/g, "<br>")}</span>`;
  }).join("");
}

function paraStyle(p: Item): CSSProperties {
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

// Lê o conteúdo editado de um parágrafo e devolve os trechos com negrito/itálico/sublinhado/tamanho.
function readRuns(el: HTMLElement): Run[] {
  const out: Run[] = [];
  const push = (t: string, host: Element) => {
    if (!t) return;
    const cs = getComputedStyle(host);
    const r: Run = {
      t,
      b: Number(cs.fontWeight) >= 600 || cs.fontWeight === "bold" || undefined,
      i: cs.fontStyle === "italic" || undefined,
      u: cs.textDecorationLine.includes("underline") || undefined,
      sz: Math.max(2, Math.round(parseFloat(cs.fontSize) * 1.5)),
    };
    const last = out[out.length - 1];
    if (last && !!last.b === !!r.b && !!last.i === !!r.i && !!last.u === !!r.u && last.sz === r.sz) last.t += t;
    else out.push(r);
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
  // uma quebra de linha solta no fim é só o "espaço" do navegador
  const last = out[out.length - 1];
  if (last && last.t.endsWith("\n")) last.t = last.t.slice(0, -1);
  return out.filter((r) => r.t !== "");
}

let uidSeq = 1;
const GAP = 28; // vão cinza entre as páginas (px)

export function DocEditor({ id, data, version, canEdit }: { id: string; data: DocData; version: string; canEdit: boolean }) {
  const [items, setItems] = useState<Item[]>(() =>
    data.paras.map((p) => ({ uid: uidSeq++, jc: p.jc, sp: p.sp, ind: p.ind, sz: p.sz, font: p.font, html: runsHtml(p.runs) })));
  const [active, setActive] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const [gaps, setGaps] = useState<number[]>([]);
  const base = useRef(version);
  const refs = useRef(new Map<number, HTMLDivElement>());
  const focusNext = useRef<{ uid: number; atStart: boolean } | null>(null);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const f = focusNext.current;
    if (!f) return;
    focusNext.current = null;
    const el = refs.current.get(f.uid);
    if (!el) return;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(f.atStart);
    const s = getSelection();
    s?.removeAllRanges(); s?.addRange(r);
  });

  // Paginação: a cada página, deixa a margem inferior, um vão e a margem superior da próxima
  // (como no Word). O vão é um bloco fixo inserido entre duas linhas, nunca no meio de uma palavra.
  const composing = useRef(false);
  const raf = useRef(0);
  const paginate = () => {
    const page = pageRef.current;
    if (!page || composing.current) return;
    page.querySelectorAll(".pgspacer").forEach((n) => n.remove());
    const { top: mt, bottom: mb, h: pageH } = data.page;
    const H = pageH - mt - mb;
    const origin = () => page.getBoundingClientRect().top + page.clientTop;
    let limit = mt + H; // y onde o texto da página atual termina
    const gaps: number[] = [];

    // primeiro caractere cuja linha começa em y ou depois (busca binária dentro de cada trecho de texto)
    const lineStart = (el: HTMLElement, after: Node | null, y: number): { node: Text; i: number } | null => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const rg = document.createRange();
      const topAt = (n: Text, i: number) => {
        rg.setStart(n, i); rg.setEnd(n, i + 1);
        const r = rg.getClientRects()[0];
        return r ? r.top - origin() : null;
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

    for (const el of page.querySelectorAll<HTMLElement>(".doc-para")) {
      let spacer: HTMLElement | null = null;
      for (let guard = 0; guard < 40; guard++) {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
        const bottom = el.offsetTop + el.offsetHeight;
        if (bottom <= limit + 0.5) break;
        const top = spacer ? spacer.getBoundingClientRect().bottom - origin() : el.offsetTop;
        const total = Math.max(1, Math.round((bottom - top) / lh));
        let fit = Math.max(0, Math.floor((limit - top + 0.5) / lh));
        if (fit < total) {
          if (total - fit === 1 && fit >= 3) fit -= 1;      // não deixa uma linha sozinha na página seguinte
          if (!spacer && fit < 2) fit = 0;                   // nem a primeira linha sozinha no fim da página
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
        gaps.push(limit + mb);
        limit = limit + mb + GAP + mt + H;
        spacer = sp;
      }
    }
    setGaps((cur) => (cur.length === gaps.length && cur.every((v, i) => v === gaps[i]) ? cur : gaps));
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
  }, [items.length]);

  const touch = () => { setDirty(true); setMsg(null); schedule(); };
  const idxOf = (uid: number) => items.findIndex((x) => x.uid === uid);

  function exec(cmd: "bold" | "italic" | "underline") {
    if (!canEdit) return;
    document.execCommand(cmd);
    touch();
  }
  function align(jc: Para["jc"]) {
    if (!canEdit || active === null) return;
    setItems((cur) => cur.map((x) => (x.uid === active ? { ...x, jc } : x)));
    touch();
  }
  function addAfter() {
    if (!canEdit) return;
    const at = active === null ? items.length - 1 : idxOf(active);
    const src = items[at] ?? items[0];
    const n: Item = { uid: uidSeq++, jc: src?.jc, sp: src?.sp ?? {}, ind: src?.ind ?? {}, sz: src?.sz ?? 24, font: src?.font ?? "Times New Roman", html: "" };
    setItems((cur) => [...cur.slice(0, at + 1), n, ...cur.slice(at + 1)]);
    focusNext.current = { uid: n.uid, atStart: true };
    touch();
  }
  function removeActive() {
    if (!canEdit || active === null || items.length < 2) return;
    const at = idxOf(active);
    const next = items[at + 1] ?? items[at - 1];
    setItems((cur) => cur.filter((x) => x.uid !== active));
    setActive(next.uid);
    focusNext.current = { uid: next.uid, atStart: true };
    touch();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>, it: Item) {
    if (!canEdit) return;
    const el = e.currentTarget;
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
      const n: Item = { ...it, uid: uidSeq++, html: box.innerHTML };
      setItems((cur) => {
        const at = cur.findIndex((x) => x.uid === it.uid);
        return [...cur.slice(0, at + 1), n, ...cur.slice(at + 1)];
      });
      focusNext.current = { uid: n.uid, atStart: true };
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
      if (pre.toString() !== "" || pre.cloneContents().querySelector("br")) return; // não está no início
      const at = idxOf(it.uid);
      if (at <= 0) return;
      e.preventDefault();
      clearSpacers();
      const prev = items[at - 1];
      const prevEl = refs.current.get(prev.uid);
      if (!prevEl) return;
      prevEl.insertAdjacentHTML("beforeend", el.innerHTML);
      const merged = prevEl.innerHTML;
      setItems((cur) => cur.filter((x) => x.uid !== it.uid).map((x) => (x.uid === prev.uid ? { ...x, html: merged } : x)));
      focusNext.current = { uid: prev.uid, atStart: false };
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

  function collect(): Para[] {
    return items.map((it) => {
      const el = refs.current.get(it.uid);
      const runs = el ? readRuns(el) : [];
      return { jc: it.jc, sp: it.sp, ind: it.ind, sz: it.sz, font: it.font, runs };
    });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveDocument(id, collect(), base.current);
      if (r.ok) {
        setDirty(false);
        if (r.version) base.current = r.version;
        router.push("/processos"); // volta para os cartões
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
    const r = await resetDocument(id);
    if (r.ok) { window.location.reload(); return; }
    setMsg({ ok: false, text: r.msg });
    setBusy(false);
  }

  const { page, header } = data;
  const hw = header ? header.w / (1 - header.crop.l - header.crop.r) : 0;
  const hh = header ? header.h / (1 - header.crop.t - header.crop.b) : 0;

  return (
    <div className="doc-wrap">
      {canEdit && (
        <div className="doc-bar">
          <button className="ghost icon" title="Negrito" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}><Bold size={16} /></button>
          <button className="ghost icon" title="Itálico" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}><Italic size={16} /></button>
          <button className="ghost icon" title="Sublinhado" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}><Underline size={16} /></button>
          <span className="doc-sep" />
          <button className="ghost icon" title="Alinhar à esquerda" onClick={() => align("left")}><AlignLeft size={16} /></button>
          <button className="ghost icon" title="Centralizar" onClick={() => align("center")}><AlignCenter size={16} /></button>
          <button className="ghost icon" title="Alinhar à direita" onClick={() => align("right")}><AlignRight size={16} /></button>
          <button className="ghost icon" title="Justificar" onClick={() => align("both")}><AlignJustify size={16} /></button>
          <span className="doc-sep" />
          <button className="ghost icon" title="Novo parágrafo depois do atual" onClick={addAfter}><Plus size={16} /></button>
          <button className="ghost icon" title="Apagar o parágrafo atual" onClick={removeActive}><Trash2 size={16} /></button>
          <span className="doc-grow" />
          {msg && (
            <span className={msg.ok ? "doc-ok" : "error"} style={{ fontSize: 13 }}>
              {msg.ok && <Check size={14} style={{ verticalAlign: "-2px" }} />} {msg.text}
            </span>
          )}
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{gaps.length + 1} {gaps.length ? "páginas" : "página"}</span>
          {dirty && !msg && <span style={{ color: "var(--muted)", fontSize: 13 }}>Alterações não salvas</span>}
          {confirmReset ? (
            <>
              <span style={{ fontSize: 13 }}>Descartar o que foi editado e refazer do cadastro?</span>
              <button className="danger" disabled={busy} onClick={reset}>Sim, refazer</button>
              <button className="ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
            </>
          ) : (
            <button className="ghost" title="Refazer o documento a partir do Cadastro inicial" disabled={busy} onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Refazer do cadastro
            </button>
          )}
          <button disabled={busy || !dirty} onClick={save}>
            {busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Salvar
          </button>
        </div>
      )}
      {!canEdit && <p style={{ color: "var(--muted)", margin: 0 }}>Você pode ver este documento, mas não editar.</p>}

      <div className="doc-scroll">
        <div className="doc-page" ref={pageRef} style={{ width: page.w, minHeight: gaps.length ? gaps[gaps.length - 1] + GAP + page.h : page.h, padding: `${page.top}px ${page.right}px ${page.bottom}px ${page.left}px` }}>
          {header && (
            <div style={{ position: "absolute", left: header.x, top: header.y, width: header.w, height: header.h, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={header.src} alt=""
                style={{ position: "absolute", width: hw, height: hh, maxWidth: "none", left: -header.crop.l * hw, top: -header.crop.t * hh }}
              />
            </div>
          )}
          {gaps.map((y, i) => (
            <div key={`g${i}`}>
              <div className="doc-gap" style={{ top: y, height: GAP }}><span>Página {i + 2}</span></div>
              {header && (
                <div style={{ position: "absolute", left: header.x, top: y + GAP + header.y, width: header.w, height: header.h, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={header.src} alt="" style={{ position: "absolute", width: hw, height: hh, maxWidth: "none", left: -header.crop.l * hw, top: -header.crop.t * hh }} />
                </div>
              )}
            </div>
          ))}
          {items.map((it) => (
            <div
              key={it.uid}
              ref={(el) => { if (el) refs.current.set(it.uid, el); else refs.current.delete(it.uid); }}
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
              dangerouslySetInnerHTML={{ __html: it.html }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
