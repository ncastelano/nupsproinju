import Link from "next/link";
import { ClipboardPen, FileText } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { metaOf, type RecMeta } from "@/lib/records";

type Row = { id: string; owner_id: string; nomes: string; processo: string; meta: RecMeta };

// Questionário do acompanhamento: escolha o processo e responda; o relatório aparece em Processos.
export default async function AcompanhamentoPage() {
  const me = await requireMember();
  const { data: all } = await createAdminClient().from("intake_records")
    .select("id, created_by, meta:answers->_meta, nomes:answers->nomes->>value, processo:answers->processo->>value")
    .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
  const rows: Row[] = (all ?? []).map((r) => ({
    id: r.id as string, owner_id: r.created_by as string, nomes: (r.nomes as string) ?? "", processo: (r.processo as string) ?? "",
    meta: metaOf({ _meta: r.meta ?? {} }),
  })).filter((r) => r.owner_id === me.id || r.meta.shared.some((s) => s.id === me.id));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Acompanhamento</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          Escolha o processo e responda o questionário da reavaliação. O relatório gerado aparece em <Link href="/processos">Processos</Link>, abaixo dos cadastros iniciais, para você editar.
        </p>
      </div>

      <h2 className="section" style={{ margin: 0 }}>ESCOLHA O PROCESSO ({rows.length})</h2>
      {rows.length === 0 ? (
        <div className="card empty">
          <p>Nenhum processo seu ou compartilhado com você ainda. Faça um <Link href="/cadastro-inicial">Cadastro inicial</Link> primeiro.</p>
        </div>
      ) : (
        <div className="user-grid wide">
          {rows.map((r) => (
            <article key={r.id} className="card pcard">
              <div className="pcard-head">
                <span className="pcard-ico"><FileText size={20} /></span>
                <span>
                  <h3>{r.nomes || "(sem nome)"}</h3>
                  <p>Processo {r.processo || "—"}</p>
                </span>
              </div>
              <span className="chip" style={{ width: "fit-content" }}>
                {r.meta.acomps.length} {r.meta.acomps.length === 1 ? "acompanhamento feito" : "acompanhamentos feitos"}
              </span>
              <div className="pcard-actions">
                <Link href={`/acompanhamento/${r.id}`}><button type="button"><ClipboardPen size={16} /> Fazer acompanhamento nº {r.meta.acomps.length ? Math.max(...r.meta.acomps.map((a) => a.n)) + 1 : 1}</button></Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
