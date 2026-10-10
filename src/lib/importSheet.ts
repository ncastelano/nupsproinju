import { parseCsv } from "@/lib/csv";

export type Ans = Record<string, { label: string; value: string }>;
export type SheetRow = { at: string | null; processo: string; answers: Ans };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/^\s*\d+(\.\d+)*\.?\s+/, "").replace(/\s+/g, " ").trim();

// Cabeçalho da planilha -> chave que o sistema já usa (o resto vira coluna própria, com o texto original).
const KNOWN: [string, string][] = [
  ["profissional responsavel pelo acompanhamento", "profissional"],
  ["numero do processo", "processo"],
  ["nome completo da(s) crianca(s)/adolescente(s)", "nomes"],
  ["data de nascimento", "nascimentos"],
  ["nome da genitora", "genitora"],
  ["endereco da genitora", "genitora_endereco"],
  ["telefone/contato da genitora", "genitora_contato"],
  ["nome do genitor", "genitor"],
  ["endereco do genitor", "genitor_endereco"],
  ["telefone/contato do genitor", "genitor_contato"],
  ["data do acolhimento", "data_acolhimento"],
  ["conselho tutelar responsavel pelo acolhimento/encaminhamento", "conselho_tutelar"],
  ["modalidade atual de acolhimento", "modalidade"],
  ["unidade/servico de acolhimento", "unidade"],
  ["procedimentos realizados na avaliacao inicial", "procedimentos"],
  ["existem outros processos judiciais relacionados a crianca/adolescente?", "outros_processos"],
  ["se sim, informe o(s) numero(s) do(s) processo(s) relacionado(s)", "outros_processos_numeros"],
];
const keyOf = (h: string, i: number) => {
  const n = norm(h);
  return KNOWN.find(([k]) => k === n)?.[1] ?? `c${String(i).padStart(2, "0")}_${n.replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`;
};

const isoDate = (v: string) => {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v.trim();
};
function stamp(v: string): string | null {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-04:00`).toISOString() : null; // Porto Velho (UTC-4)
}

export function readSheet(csv: string): { rows: SheetRow[]; headers: string[] } {
  const table = parseCsv(csv);
  if (table.length < 2) return { rows: [], headers: [] };
  const headers = table[0].map((h) => h.trim());
  const tsCol = headers.findIndex((h) => norm(h).startsWith("carimbo"));
  const rows: SheetRow[] = [];
  for (const cells of table.slice(1)) {
    const answers: Ans = {};
    headers.forEach((h, i) => {
      if (i === tsCol || !h) return;
      let v = (cells[i] ?? "").trim();
      if (!v) return;
      const key = keyOf(h, i);
      if (key === "data_acolhimento") v = isoDate(v);
      answers[key] = { label: h, value: v };
    });
    if (Object.keys(answers).length === 0) continue;
    rows.push({
      at: tsCol >= 0 ? stamp(cells[tsCol] ?? "") : null,
      processo: answers.processo?.value ?? "",
      answers,
    });
  }
  return { rows, headers };
}
