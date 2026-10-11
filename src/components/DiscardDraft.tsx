"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCadastro } from "@/app/(app)/cadastrados/records-actions";
import { deleteAcompanhamento } from "@/app/(app)/cadastrados/[id]/documento/actions";
import { deleteFiscalizacao } from "@/app/(app)/fiscalizacoes/actions";

// Descarta um rascunho (com confirmação na tela) e volta para Relatórios.
export function DiscardDraft({ kind, id, n }: { kind: "cadastro" | "acompanhamento" | "fiscalizacao"; id: string; n?: number }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      let r: string;
      if (kind === "cadastro") { const fd = new FormData(); fd.set("record_id", id); r = await deleteCadastro(fd); }
      else if (kind === "acompanhamento") r = await deleteAcompanhamento(id, n ?? 0);
      else r = await deleteFiscalizacao(id);
      if (r === "ok") router.push("/processos"); else setErr(r);
    });
  }

  if (!ask) return <button type="button" className="danger" onClick={() => setAsk(true)}><Trash2 size={16} /> Descartar rascunho</button>;
  return (
    <span className="confirm-del">
      <span>Descartar este rascunho?</span>
      <button type="button" className="danger" disabled={pending} onClick={run}>{pending ? "Apagando..." : "Sim, descartar"}</button>
      <button type="button" className="ghost" disabled={pending} onClick={() => setAsk(false)}>Cancelar</button>
      {err && <span className="export-err">{err}</span>}
    </span>
  );
}
