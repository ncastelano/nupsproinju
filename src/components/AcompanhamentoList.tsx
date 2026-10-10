"use client";
import { useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import { deleteAcolhimento } from "@/app/(app)/actions";

export type Card = { id: string; created_at: string; process_number: string; children_names: string; text: string };

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ghost"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch {}
      }}
    >
      {done ? <Check size={16} /> : <Copy size={16} />} {done ? "Copiado" : "Copiar texto"}
    </button>
  );
}

export function AcompanhamentoList({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <div className="card empty"><h3>Nenhum acompanhamento ainda</h3><p>Os formulários preenchidos aparecem aqui como texto.</p></div>;
  }
  return (
    <div className="grid" style={{ gap: 14 }}>
      {cards.map((c) => (
        <article key={c.id} className="card grid" style={{ gap: 12 }}>
          <header className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{c.children_names}</strong>
              <div style={{ color: "var(--muted)" }}>
                Processo {c.process_number} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <div className="row">
              <CopyButton text={c.text} />
              <form action={deleteAcolhimento} onSubmit={(e) => { if (!confirm("Apagar este acompanhamento?")) e.preventDefault(); }}>
                <input type="hidden" name="id" value={c.id} />
                <button className="danger" aria-label="Apagar"><Trash2 size={16} /></button>
              </form>
            </div>
          </header>
          <p className="narrative">{c.text}</p>
        </article>
      ))}
    </div>
  );
}
