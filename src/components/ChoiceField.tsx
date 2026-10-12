"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

const OUTRO = "Outro";

// Campo de escolha padrão do sistema: parece uma lista suspensa; ao clicar abre um quadro no meio da tela com as opções.
// Envia como campos ocultos com o mesmo nome do formulário: `name` (um por opção marcada) e `name__outro` (texto de "Outro").
export function ChoiceField({
  name, options, multiple = false, other = false, initial = [], initialOther = "", title,
  onChange, placeholder = "Selecione...", singleOtherValue = OUTRO,
}: {
  name: string;
  options: string[];
  multiple?: boolean;
  other?: boolean;                 // inclui "Outro" com campo de texto
  initial?: string[];              // opções marcadas (use "Outro" para a opção Outro)
  initialOther?: string;
  title?: string;                  // título do quadro (normalmente a pergunta)
  onChange?: (selected: string[], otherText: string) => void;
  placeholder?: string;
  singleOtherValue?: string;       // valor enviado quando a escolha única é "Outro"
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initial);
  const [otherText, setOtherText] = useState(initialOther);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // trava a rolagem da página enquanto o quadro está aberto (a roda do mouse rola só as opções)
    const html = document.documentElement, body = document.body;
    const prevHtml = html.style.overflow, prevBody = body.style.overflow;
    html.style.overflow = "hidden"; body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); html.style.overflow = prevHtml; body.style.overflow = prevBody; };
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
  const close = () => { setOpen(false); setFilter(""); };

  return (
    <div className="choice">
      {multiple
        ? selected.map((s) => <input key={s} type="hidden" name={name} value={s} />)
        : selected[0] !== undefined && <input type="hidden" name={name} value={selected[0] === OUTRO ? singleOtherValue : selected[0]} />}
      {hasOther && <input type="hidden" name={`${name}__outro`} value={otherText} />}

      <button type="button" className={`choice-box${open ? " open" : ""}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <span className={`choice-values${summary.length ? "" : " placeholder"}`}>{summary.length ? summary.join("; ") : placeholder}</span>
        {multiple && summary.length > 1 && <span className="choice-count">{summary.length}</span>}
        <ChevronDown size={18} />
      </button>

      {open && (
        <div className="choice-overlay" onMouseDown={close}>
          <div className="choice-panel" role="dialog" aria-label={title ?? "Escolha uma opção"} onMouseDown={(e) => e.stopPropagation()}>
            <div className="choice-head">
              <strong>{title ?? "Escolha uma opção"}</strong>
              <button type="button" className="ghost icon" aria-label="Fechar" onClick={close}><X size={18} /></button>
            </div>
            {all.length > 8 && (
              <input type="search" className="choice-search" placeholder="Buscar..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            )}
            <div className="choice-list" role="listbox">
              {shown.map((o) => {
                const on = selected.includes(o);
                return (
                  <button key={o} type="button" role="option" aria-selected={on} className={`choice-opt${on ? " on" : ""}${multiple ? "" : " single"}`} onClick={() => pick(o)}>
                    <span className="choice-check">{on && <Check size={14} />}</span>
                    <span>{o}</span>
                  </button>
                );
              })}
              {shown.length === 0 && <div className="choice-none">Nenhuma opção encontrada.</div>}
            </div>
            {hasOther && (
              <input className="choice-other" placeholder="Qual?" value={otherText} autoFocus onChange={(e) => commit(selected, e.target.value)} />
            )}
            {(multiple || hasOther) && <button type="button" className="choice-done" onClick={close}>Pronto</button>}
          </div>
        </div>
      )}
    </div>
  );
}
