import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { metaOf, type RecMeta } from "@/lib/records";
import { AcompActions } from "@/components/AcompActions";
import { RecordActivity } from "@/components/RecordActivity";
import { createAcompanhamento } from "../cadastrados/[id]/documento/actions";

type Row = { id: string; owner_id: string; owner: string; nomes: string; processo: string; created_at: string; meta: RecMeta };

const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

// Relatórios de acompanhamento e reavaliação, por processo.
export default async function AcompanhamentoPage() {
  const me = await requireMember();
  const admin = createAdminClient();
  const [{ data: all }, { data: ppl }] = await Promise.all([
    admin.from("intake_records")
      .select("id, created_by, created_at, meta:answers->_meta, nomes:answers->nomes->>value, processo:answers->processo->>value")
      .eq("form_key", FORM_KEY).order("created_at", { ascending: false }),
    admin.from("members").select("id, name"),
  ]);
  const names = new Map((ppl ?? []).map((p) => [p.id as string, p.name as string]));
  const rows: Row[] = (all ?? []).map((r) => ({
    id: r.id as string, owner_id: r.created_by as string, owner: names.get(r.created_by as string) ?? "",
    nomes: (r.nomes as string) ?? "", processo: (r.processo as string) ?? "", created_at: r.created_at as string,
    meta: metaOf({ _meta: r.meta ?? {} }),
  })).filter((r) => r.owner_id === me.id || r.meta.shared.some((s) => s.id === me.id));

  const total = rows.reduce((n, r) => n + r.meta.acomps.length, 0);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Acompanhamento</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          Relatórios de acompanhamento e reavaliação de cada processo. Cada um abre o modelo do NUPS já com a identificação preenchida.
        </p>
      </div>

      <h2 className="section" style={{ margin: 0 }}>PROCESSOS ({rows.length}) · ACOMPANHAMENTOS ({total})</h2>
      {rows.length === 0 ? (
        <div className="card empty"><p>Nenhum processo ainda. Faça um Cadastro inicial primeiro.</p></div>
      ) : (
        <div className="user-grid wide">
          {rows.map((r) => {
            const list = [...r.meta.acomps].sort((a, b) => b.n - a.n);
            return (
              <article key={r.id} className="card pcard">
                <Link href={`/cadastrados/${r.id}/documento`} className="pcard-head">
                  <span className="pcard-ico"><FileText size={20} /></span>
                  <span>
                    <h3>{r.nomes || "(sem nome)"}</h3>
                    <p>Processo {r.processo || "—"}</p>
                  </span>
                </Link>

                {list.length === 0 ? (
                  <p style={{ margin: 0, color: "var(--muted)" }}>Nenhum acompanhamento deste processo ainda.</p>
                ) : (
                  <div className="acomp-list">
                    {list.map((a) => (
                      <div key={a.n} className="acomp-item">
                        <h4>Acompanhamento nº {a.n}</h4>
                        <span style={{ color: "var(--muted)", fontSize: 13.5 }}>Criado por {a.by_name || "—"} em {day(a.at)}</span>
                        <AcompActions id={r.id} n={a.n} canDelete={r.owner_id === me.id || me.role === "admin"} />
                        <RecordActivity
                          history={r.meta.history.filter((h) => h.doc === `acomp:${a.n}`)}
                          createdAt={a.at} ownerName={a.by_name} showCreated={false} limit={2}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <form action={createAcompanhamento.bind(null, r.id)}>
                  <button className="ghost"><Plus size={16} /> Novo acompanhamento</button>
                </form>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
