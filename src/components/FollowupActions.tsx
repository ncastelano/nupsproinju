"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteFollowup } from "@/app/(app)/cadastrados/records-actions";

// Ações do cartão de acompanhamento: compartilhar o link ou apagar só este acompanhamento.
// A confirmação é na própria tela (a caixa do navegador pode ser bloqueada no celular).
export function FollowupActions({ recordId, at, nome }: { recordId: string; at: string; nome: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    const fd = new FormData();
    fd.set("record_id", recordId);
    fd.set("at", at);
    start(async () => {
      const r = await deleteFollowup(fd);
      if (r === "ok") { setAsk(false); router.refresh(); } else setErr(r);
    });
  }

  return (
    <>
      <ShareMenu
        path={`/cadastrados/${recordId}`}
        text={`Acompanhamento de ${nome} (Núcleo Psicossocial – VPIJ Porto Velho):`}
        label="Compartilhar"
        className="ghost"
        note="Só abre para quem estiver logado e tiver acesso."
      />
      {!ask ? (
        <button type="button" className="danger" onClick={() => { setErr(null); setAsk(true); }}>
          <Trash2 size={16} /> Deletar
        </button>
      ) : (
        <span className="confirm-del">
          <span>Apagar este acompanhamento?</span>
          <button type="button" className="danger" disabled={pending} onClick={remove}>
            {pending ? "Apagando..." : "Sim, apagar"}
          </button>
          <button type="button" className="ghost" disabled={pending} onClick={() => setAsk(false)}>Cancelar</button>
        </span>
      )}
      {err && <span className="export-err">{err}</span>}
    </>
  );
}
