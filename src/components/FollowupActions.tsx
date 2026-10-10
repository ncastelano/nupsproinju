"use client";
import { Trash2 } from "lucide-react";
import { ShareMenu } from "@/components/ShareMenu";
import { deleteFollowup } from "@/app/(app)/cadastrados/records-actions";

// Ações do cartão de acompanhamento: compartilhar o link ou apagar só este acompanhamento.
export function FollowupActions({ recordId, at, nome }: { recordId: string; at: string; nome: string }) {
  return (
    <>
      <ShareMenu
        path={`/cadastrados/${recordId}`}
        text={`Acompanhamento de ${nome} (Núcleo Psicossocial – VPIJ Porto Velho):`}
        label="Compartilhar"
        className="ghost"
        note="Só abre para quem estiver logado e tiver acesso."
      />
      <form
        action={deleteFollowup}
        onSubmit={(e) => { if (!confirm("Apagar este acompanhamento? O cadastro inicial não é apagado.")) e.preventDefault(); }}
      >
        <input type="hidden" name="record_id" value={recordId} />
        <input type="hidden" name="at" value={at} />
        <button className="danger"><Trash2 size={16} /> Deletar</button>
      </form>
    </>
  );
}
