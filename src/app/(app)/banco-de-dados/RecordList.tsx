"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, ExternalLink, Printer, X, ClipboardPen } from "lucide-react";
import type { Question } from "@/lib/forms";
import { ResumoA4, type Answers } from "@/components/ResumoA4";
import { formatDate } from "@/components/RecordView";

export type Item = { id: string; answers: Answers; followup: Answers | null };

export function RecordList({ items, questions }: { items: Item[]; questions: Question[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const current = items.find((i) => i.id === openId) ?? null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (openId && !d.open) d.showModal();
    if (!openId && d.open) d.close();
  }, [openId]);

  return (
    <>
      {items.map((c) => {
        const reav = c.followup?.acomp_2?.value;
        return (
          <button key={c.id} className="tile-btn" onClick={() => setOpenId(c.id)}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <div>
                <h3>{c.answers.nomes?.value ?? "(sem nome)"}</h3>
                <p>Proc. {c.answers.processo?.value ?? "—"}{c.answers.unidade?.value ? ` · ${c.answers.unidade.value}` : ""}</p>
                <div className="row" style={{ marginTop: 10 }}>
                  {c.followup
                    ? <span className="badge">Acompanhamento{reav ? ` · reavaliação ${formatDate(reav)}` : ""}</span>
                    : <span className="badge off">Sem acompanhamento</span>}
                </div>
              </div>
              <ChevronRight />
            </div>
          </button>
        );
      })}

      <dialog
        ref={ref}
        className="big"
        onClose={() => setOpenId(null)}
        onClick={(e) => { if (e.target === ref.current) setOpenId(null); }}
      >
        {current && (
          <div className="big-body">
            <div className="big-bar">
              <strong>Resumo do acompanhamento</strong>
              <div className="row">
                <Link href={`/banco-de-dados/${current.id}/resumo`}><button className="ghost"><Printer size={16} /> Imprimir</button></Link>
                <Link href={`/formulario?aba=acompanhamento&acolhido=${current.id}`}><button className="ghost"><ClipboardPen size={16} /> Editar</button></Link>
                <Link href={`/banco-de-dados/${current.id}`}><button className="ghost"><ExternalLink size={16} /> Ficha completa</button></Link>
                <button className="ghost" aria-label="Fechar" onClick={() => setOpenId(null)}><X size={18} /></button>
              </div>
            </div>
            <ResumoA4 answers={current.answers} followup={current.followup} questions={questions} />
          </div>
        )}
      </dialog>
    </>
  );
}
