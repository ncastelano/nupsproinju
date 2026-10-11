"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileText, Trash2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteCadastro } from "@/app/(app)/cadastrados/records-actions";

// Ações do cartão de cadastro inicial: compartilhar o link ou apagar (com confirmação na tela).
export function RecordActions({ recordId, nome, canDelete }: { recordId: string; nome: string; canDelete: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    const fd = new FormData();
    fd.set("record_id", recordId);
    start(async () => {
      const r = await deleteCadastro(fd);
      if (r === "ok") { setAsk(false); router.refresh(); } else setErr(r);
    });
  }

  return (
    <>
      <Link href={`/cadastrados/${recordId}/documento`}>
        <button type="button"><FileText size={16} /> Abrir</button>
      </Link>
      <ShareMenu
        path={`/cadastrados/${recordId}`}
        text={`Cadastro inicial de ${nome} (Núcleo Psicossocial – PROINJU):`}
        label="Compartilhar"
        className="ghost"
        note="Só abre para quem estiver logado e tiver acesso."
      />
      <a href={`/cadastrados/${recordId}/relatorio`}>
        <button type="button" className="ghost"><Download size={16} /> Baixar</button>
      </a>
      {canDelete && (!ask ? (
        <button type="button" className="danger" onClick={() => { setErr(null); setAsk(true); }}>
          <Trash2 size={16} /> Deletar
        </button>
      ) : (
        <span className="confirm-del">
          <span>Apagar o cadastro e os acompanhamentos dele?</span>
          <button type="button" className="danger" disabled={pending} onClick={remove}>
            {pending ? "Apagando..." : "Sim, apagar"}
          </button>
          <button type="button" className="ghost" disabled={pending} onClick={() => setAsk(false)}>Cancelar</button>
        </span>
      ))}
      {err && <span className="export-err">{err}</span>}
    </>
  );
}
