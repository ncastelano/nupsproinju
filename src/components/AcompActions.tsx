"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteAcompanhamento } from "@/app/(app)/cadastrados/[id]/documento/actions";

// Abrir, baixar e apagar (com confirmação na tela) um relatório de acompanhamento.
export function AcompActions({ id, n, nome, canDelete }: { id: string; n: number; nome: string; canDelete: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const r = await deleteAcompanhamento(id, n);
      if (r === "ok") { setAsk(false); router.refresh(); } else setErr(r);
    });
  }

  return (
    <div className="pcard-actions">
      <Link href={`/cadastrados/${id}/acompanhamento/${n}`}><button type="button"><FileText size={16} /> Abrir</button></Link>
      <ShareMenu
        path={`/cadastrados/${id}/acompanhamento/${n}`}
        text={`Acompanhamento nº ${n} de ${nome} (Núcleo Psicossocial – VPIJ Porto Velho):`}
        label="Compartilhar"
        className="ghost"
        note="Só abre para quem estiver logado e tiver acesso ao processo."
      />
      <a href={`/cadastrados/${id}/acompanhamento/${n}/baixar`}><button type="button" className="ghost"><Download size={16} /> Baixar</button></a>
      {canDelete && (!ask ? (
        <button type="button" className="danger" onClick={() => { setErr(null); setAsk(true); }}><Trash2 size={16} /> Deletar</button>
      ) : (
        <span className="confirm-del">
          <span>Apagar este acompanhamento?</span>
          <button type="button" className="danger" disabled={pending} onClick={remove}>{pending ? "Apagando..." : "Sim, apagar"}</button>
          <button type="button" className="ghost" disabled={pending} onClick={() => setAsk(false)}>Cancelar</button>
        </span>
      ))}
      {err && <span className="export-err">{err}</span>}
    </div>
  );
}
