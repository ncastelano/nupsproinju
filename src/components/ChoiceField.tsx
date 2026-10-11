"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const OUTRO = "Outro";

// Campo de escolha em uma linha: clique para abrir as opções, marque quantas quiser (ou uma só).
// Envia como campos ocultos com o mesmo nome do formulário: `name` (um por opção marcada) e `name__outro` (texto de "Outro").
export function ChoiceField({
  name, options, multiple = false, other = false, initial = [], initialOther = "",
  onChange, placeholder = "Selecione...", singleOtherValue = OUTRO,
}: {
  name: string;
  options: string[];
  multiple?: boolean;
  other?: boolean;                 // inclui "Outro" com campo de texto
  initial?: string[];              // opções marcadas (use "Outro" para a opção Outro)
  initialOther?: string;
  onChange?: (selected: string[], otherText: string) => void;
  placeholder?: string;
  singleOtherValue?: string;       // valor enviado quando a escolha única é "Outro"
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initial);
  const [otherText, setOtherText] = useState(initialOther);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const commit = (sel: string[], text: string) => { setSelected(sel); setOtherText(text); onChange?.(sel, text); };
  const pick = (o: string) => {
    if (multiple) commit(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o], otherText);
    else { commit([o], otherText); if (o !== OUTRO) setOpen(false); }
  };

  const all = useMemo(() => [...options, ...(other ? [OUTRO] : [])], [options, other]);
  const shown = filter ? all.filter((o) => o.toLowerCase().includes(filter.toLowerCase())) : all;
  const hasOther = selected.includes(OUTRO);
  const summary = selected.map((s) => (s === OUTRO ? `Outro${otherText ? `: ${otherText}` : ""}` : s));

  return (
    <div className="choice" ref={ref}>
      {multiple
        ? selected.map((s) => <input key={s} type="hidden" name={name} value={s} />)
        : selected[0] !== undefined && <input type="hidden" name={name} value={selected[0] === OUTRO ? singleOtherValue : selected[0]} />}
      {hasOther && <input type="hidden" name={`${name}__outro`} value={otherText} />}

      <button type="button" className={`choice-box${open ? " open" : ""}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={`choice-values${summary.length ? "" : " placeholder"}`}>{summary.length ? summary.join("; ") : placeholder}</span>
        {multiple && summary.length > 1 && <span className="choice-count">{summary.length}</span>}
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="choice-panel" role="listbox">
          {all.length > 8 && (
            <input type="search" className="choice-search" placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} autoFocus />
          )}
          <div className="choice-list">
            {shown.map((o) => {
              const on = selected.includes(o);
              return (
                <button key={o} type="button" role="option" aria-selected={on} className={`choice-opt${on ? " on" : ""}`} onClick={() => pick(o)}>
                  <span className="choice-check">{on && <Check size={14} />}</span>
                  <span>{o}</span>
                </button>
              );
            })}
            {shown.length === 0 && <div className="choice-none">Nenhuma opção encontrada.</div>}
          </div>
          {hasOther && (
            <input
              className="choice-other" placeholder="Qual?" value={otherText} autoFocus
              onChange={(e) => commit(selected, e.target.value)}
            />
          )}
          {multiple && <button type="button" className="choice-done" onClick={() => setOpen(false)}>Pronto</button>}
        </div>
      )}
    </div>
  );
}
