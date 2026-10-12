import { isTable, type Block, type Para, type Run } from "@/lib/docxDoc";

// Mescla de três vias (base × minha × deles) por bloco, para a edição ao mesmo tempo.
// A assinatura de cada bloco ignora detalhes que mudam só por passar pelo editor (fonte do parágrafo,
// espaçamento), para que o que ninguém mexeu nunca pareça alteração.

const colorOf = (c?: string) => (!c || /^(000000|auto)$/i.test(c) ? "" : c.toUpperCase());

function sigRuns(runs: Run[]): string {
  const out: string[] = [];
  let cur = "";
  let fmt = "";
  for (const r of runs) {
    if (!r.t) continue;
    const f = `${r.b ? 1 : 0}${r.i ? 1 : 0}${r.u ? 1 : 0}|${r.sz}|${colorOf(r.c)}|${(r.cm ?? []).join(",")}`;
    if (f === fmt) cur += r.t;
    else { if (fmt) out.push(`${fmt}:${cur}`); fmt = f; cur = r.t; }
  }
  if (fmt) out.push(`${fmt}:${cur}`);
  return out.join("§");
}

const sigPara = (p: Para) => (p.img ? `I${p.img.src?.length ?? 0}:${(p.img.src ?? "").slice(-24)}` : sigRuns(p.runs));

export function sigBlock(b: Block): string {
  if (isTable(b)) return "T" + b.rows.map((row) => row.map((cell) => cell.map(sigPara).join("¶")).join("‖")).join("¦");
  return "P" + sigPara(b);
}

// Maior subsequência comum: devolve, para cada índice de a, o índice correspondente em b (ou -1).
function match(a: string[], b: string[]): number[] {
  const n = a.length, m = b.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const out = new Array<number>(n).fill(-1);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out[i] = j; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return out;
}

export type Pick = { from: "mine" | "theirs"; i: number };
export type Merged = { picks: Pick[]; conflicts: number };

// base: o que eu abri; mine: o que está na minha tela; theirs: o que está salvo agora.
export function merge3(base: Block[], mine: Block[], theirs: Block[]): Merged {
  const B = base.map(sigBlock), M = mine.map(sigBlock), T = theirs.map(sigBlock);
  const bm = match(B, M), bt = match(B, T);
  const picks: Pick[] = [];
  let conflicts = 0;

  // trechos entre âncoras (blocos que nenhum dos dois alterou)
  let pb = 0, pm = 0, pt = 0;
  const flush = (eb: number, em: number, et: number) => {
    const sb = B.slice(pb, eb), sm = M.slice(pm, em), st = T.slice(pt, et);
    const same = (x: string[], y: string[]) => x.length === y.length && x.every((v, k) => v === y[k]);
    const takeM = () => { for (let k = pm; k < em; k++) picks.push({ from: "mine", i: k }); };
    const takeT = () => { for (let k = pt; k < et; k++) picks.push({ from: "theirs", i: k }); };
    if (same(sm, sb)) takeT();
    else if (same(st, sb) || same(sm, st)) takeM();
    else if (sm.length === sb.length && st.length === sb.length) {
      // mesmo número de blocos: decide bloco a bloco
      for (let k = 0; k < sb.length; k++) {
        if (sm[k] === sb[k]) picks.push({ from: "theirs", i: pt + k });
        else if (st[k] === sb[k] || st[k] === sm[k]) picks.push({ from: "mine", i: pm + k });
        else { picks.push({ from: "theirs", i: pt + k }, { from: "mine", i: pm + k }); conflicts++; }
      }
    } else {
      // mudaram o mesmo trecho de jeitos diferentes: fica tudo que foi alterado ou criado por qualquer um dos dois
      const orig = new Set(sb);
      for (let k = pt; k < et; k++) if (!orig.has(T[k])) picks.push({ from: "theirs", i: k });
      for (let k = pm; k < em; k++) if (!orig.has(M[k])) picks.push({ from: "mine", i: k });
      conflicts++;
    }
  };
  for (let k = 0; k < B.length; k++) {
    if (bm[k] < 0 || bt[k] < 0) continue;
    flush(k, bm[k], bt[k]);
    picks.push({ from: "mine", i: bm[k] }); // âncora: igual nos dois
    pb = k + 1; pm = bm[k] + 1; pt = bt[k] + 1;
  }
  flush(B.length, M.length, T.length);
  return { picks, conflicts };
}
