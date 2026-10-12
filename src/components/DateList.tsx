"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

const toIso = (br: string) => { const m = br.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const toBr = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };

// Uma ou mais datas (ex.: nascimento de cada criança). Cada uma é um campo de data igual ao das outras perguntas;
// o valor segue como "dd/mm/aaaa; dd/mm/aaaa".
export function DateList({ name, initial = "" }: { name: string; initial?: string }) {
  const start = initial.split(/[;\n]/).map((s) => toIso(s)).filter(Boolean);
  const [dates, setDates] = useState<string[]>(start.length ? start : [""]);
  const value = dates.map(toBr).filter(Boolean).join("; ");
  const set = (i: number, v: string) => setDates((cur) => cur.map((d, k) => (k === i ? v : d)));

  return (
    <div className="grid" style={{ gap: 8 }}>
      <input type="hidden" name={name} value={value} />
      {dates.map((d, i) => (
        <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
          <input type="date" value={d} onChange={(e) => set(i, e.target.value)} aria-label={`Data de nascimento ${i + 1}`} />
          {dates.length > 1 && (
            <button type="button" className="ghost icon" aria-label="Remover esta data" onClick={() => setDates((cur) => cur.filter((_, k) => k !== i))}><X size={16} /></button>
          )}
        </div>
      ))}
      <div>
        <button type="button" className="ghost" onClick={() => setDates((cur) => [...cur, ""])}><Plus size={16} /> Adicionar data de nascimento</button>
      </div>
    </div>
  );
}
