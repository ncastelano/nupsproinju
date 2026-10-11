"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardPen, Download, FileText, Trash2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { DownloadMenu } from "@/components/DownloadMenu";
import { deleteCadastro } from "@/app/(app)/cadastrados/records-actions";

// Ações do cartão de cadastro inicial: compartilhar o link ou apagar (com confirmação na tela).
export function RecordActions({ recordId, nome, canDelete, draft = false, hideOpen = false, after }: {
  recordId: string; nome: string; canDelete: boolean; draft?: boolean; hideOpen?: boolean; after?: string;
}) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    const fd = new FormData();
    fd.set("record_id", recordId);
    start(async () => {
      const r = await deleteCadastro(fd);
      if (r === "ok") { setAsk(false); if (after) router.push(after); else router.refresh(); } else setErr(r);
    });
  }

  return (
    <>
      {draft ? (
        <Link href={`/cadastro-inicial?rascunho=${recordId}`}>
          <button type="button"><ClipboardPen size={16} /> Continuar</button>
        </Link>
      ) : (
        <>
          {!hideOpen && (
            <Link href={`/cadastrados/${recordId}/documento`}>
              <button type="button"><FileText size={16} /> Abrir</button>
            </Link>
          )}
          <ShareMenu
            path={`/cadastrados/${recordId}/documento`}
            text={`Cadastro inicial de ${nome} (Núcleo Psicossocial – PROINJU):`}
            label="Compartilhar"
            className="ghost"
            note="Só abre para quem estiver logado e tiver acesso."
          />
          <DownloadMenu href={`/cadastrados/${recordId}/relatorio`} />
        </>
      )}
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
