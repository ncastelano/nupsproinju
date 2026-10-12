"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

// Busca nos relatórios: por tipo, pessoa, data, nome ou qualquer texto dentro dos arquivos.
export function ReportSearch({ value }: { value: string }) {
  const router = useRouter();
  const path = usePathname();
  const [text, setText] = useState(value);
  const first = useRef(true);

  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (text === value) return;
    const t = setTimeout(() => router.replace(text.trim() ? `${path}?q=${encodeURIComponent(text.trim())}` : path, { scroll: false }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="report-search">
      <Search size={16} />
      <input
        type="search" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Buscar processo, ou nome de pessoas, ou frase do texto dos arquivos"
        aria-label="Buscar nos relatórios"
      />
      {text && <button type="button" className="ghost icon" aria-label="Limpar busca" onClick={() => setText("")}><X size={14} /></button>}
    </div>
  );
}
