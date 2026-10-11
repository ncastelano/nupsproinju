"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardPen, Download, FileText, Trash2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteFiscalizacao } from "@/app/(app)/fiscalizacoes/actions";

// Botões de uma fiscalização: responder, abrir o relatório, compartilhar, baixar e apagar.
export function FiscActions({
  id, done, nome, canDelete,
}: {
  id: string; done: boolean; nome: string; canDelete: boolean;
}) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<string>) =>
    start(async () => { const r = await fn(); if (r === "ok") { setAsk(false); router.refresh(); } else setErr(r); });

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

    </>
  );
}
