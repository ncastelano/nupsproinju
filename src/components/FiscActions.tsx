"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPen, Download, FileText, Trash2, UserPlus, X } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteFiscalizacao, shareFisc, unshareFisc } from "@/app/(app)/fiscalizacoes/actions";

// Botões de uma fiscalização: responder, abrir o relatório, compartilhar, baixar e apagar.
export function FiscActions({
  id, done, nome, canDelete, canShare, shared, people,
}: {
  id: string; done: boolean; nome: string; canDelete: boolean; canShare: boolean;
  shared: { id: string; name: string }[]; people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [who, setWho] = useState("");

  const run = (fn: () => Promise<string>) =>
    start(async () => { const r = await fn(); if (r === "ok") { setAsk(false); setWho(""); router.refresh(); } else setErr(r); });

  return (
    <>
      <div className="pcard-actions">
        {done ? (
          <>
            <Link href={`/fiscalizacoes/${id}`}><button type="button"><FileText size={16} /> Abrir</button></Link>
            <Link href={`/fiscalizacoes/${id}/responder`}><button type="button" className="ghost"><ClipboardPen size={16} /> Editar respostas</button></Link>
          </>
        ) : (
          <Link href={`/fiscalizacoes/${id}/responder`}><button type="button"><ClipboardPen size={16} /> Responder questionário</button></Link>
        )}
        <ShareMenu
          path={`/fiscalizacoes/${id}`}
          text={`Fiscalização – ${nome} (Núcleo Psicossocial – VPIJ Porto Velho):`}
          label="Compartilhar" className="ghost"
          note="Só abre para quem estiver logado e tiver acesso."
        />
        {done && (
          <a href={`/fiscalizacoes/${id}/baixar`}><button type="button" className="ghost"><Download size={16} /> Baixar</button></a>
        )}
        {canDelete && (!ask ? (
          <button type="button" className="danger" onClick={() => { setErr(null); setAsk(true); }}><Trash2 size={16} /> Deletar</button>
        ) : (
          <span className="confirm-del">
            <span>Apagar esta fiscalização e o relatório?</span>
            <button type="button" className="danger" disabled={pending} onClick={() => run(() => deleteFiscalizacao(id))}>{pending ? "Apagando..." : "Sim, apagar"}</button>
            <button type="button" className="ghost" disabled={pending} onClick={() => setAsk(false)}>Cancelar</button>
          </span>
        ))}
        {err && <span className="export-err">{err}</span>}
      </div>

      {canShare && (
        <details className="act-more">
          <summary><UserPlus size={14} style={{ verticalAlign: "-2px" }} /> Quem pode editar</summary>
          <div className="grid" style={{ gap: 8, marginTop: 8 }}>
            {shared.map((s) => (
              <div key={s.id} className="qrow">
                <strong>{s.name}</strong>
                <button type="button" className="danger" aria-label={`Remover ${s.name}`} disabled={pending} onClick={() => run(() => unshareFisc(id, s.id))}><X size={16} /></button>
              </div>
            ))}
            {people.length > 0 && (
              <div className="row">
                <select value={who} onChange={(e) => setWho(e.target.value)}>
                  <option value="" disabled>Escolher pessoa...</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button type="button" disabled={!who || pending} onClick={() => run(() => shareFisc(id, who))}>Dar acesso</button>
              </div>
            )}
          </div>
        </details>
      )}
    </>
  );
}
