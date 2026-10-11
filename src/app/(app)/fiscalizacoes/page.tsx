import Link from "next/link";
import { CalendarClock, ClipboardCheck } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { metaOf, type RecMeta } from "@/lib/records";
import { FISC_KEY, PROFISSIONAIS_PADRAO } from "@/lib/fisc";
import { AccessLine, RecordActivity } from "@/components/RecordActivity";
import { FiscActions } from "@/components/FiscActions";
import { ScheduleVisit } from "@/components/ScheduleVisit";

type Row = { id: string; owner_id: string; owner: string; created_at: string; meta: RecMeta };

const day = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

// Fiscalizações: visitas às unidades de acolhimento; cada uma tem um questionário e gera um relatório editável.
export default async function FiscalizacoesPage() {
  const me = await requireMember();
  const admin = createAdminClient();
  const [{ data: all }, { data: ppl }] = await Promise.all([
    admin.from("intake_records").select("id, created_by, created_at, meta:answers->_meta")
      .eq("form_key", FISC_KEY).order("created_at", { ascending: false }),
    admin.from("members").select("id, name, status"),
  ]);
  const approved = (ppl ?? []).filter((p) => p.status === "approved");
  const names = new Map((ppl ?? []).map((p) => [p.id as string, p.name as string]));
  const rows: Row[] = (all ?? []).map((r) => ({
    id: r.id as string, owner_id: r.created_by as string, owner: names.get(r.created_by as string) ?? "",
    created_at: r.created_at as string, meta: metaOf({ _meta: r.meta ?? {} }),
  })).filter((r) => r.owner_id === me.id || r.meta.shared.some((s) => s.id === me.id));

  // mais próximas primeiro: agendadas por data; as realizadas depois, da mais recente
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Porto_Velho" });
  rows.sort((a, b) => {
    const A = a.meta.visit, B = b.meta.visit;
    if (A?.status !== B?.status) return A?.status === "agendada" ? -1 : 1;
    const da = A?.date ?? "", db = B?.date ?? "";
    return A?.status === "agendada" ? da.localeCompare(db) : db.localeCompare(da);
  });

  const people = [...new Set([...PROFISSIONAIS_PADRAO, ...approved.map((p) => p.name as string).filter(Boolean)])];
  const shareable = approved.filter((p) => p.id !== me.id).map((p) => ({ id: p.id as string, name: (p.name as string) || "(sem nome)" }));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: "8px 0 0" }}>Fiscalizações</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
            Agende as visitas às unidades. Depois da visita, responda o questionário e o relatório é gerado para você editar.
          </p>
        </div>
      </div>

      <ScheduleVisit people={people} me={me.name} />

      <h2 className="section" style={{ margin: 0 }}>VISITAS ({rows.length})</h2>
      {rows.length === 0 ? (
        <div className="card empty"><p>Nenhuma visita agendada ainda.</p></div>
      ) : (
        <div className="user-grid wide">
          {rows.map((r) => {
            const v = r.meta.visit;
            const done = v?.status === "realizada";
            const late = !done && !!v?.date && v.date < today;
            const unit = v?.unit || "(sem unidade)";
            const isOwner = r.owner_id === me.id;
            return (
              <article key={r.id} className="card pcard">
                <Link href={done ? `/fiscalizacoes/${r.id}` : `/fiscalizacoes/${r.id}/responder`} className="pcard-head">
                  <span className="pcard-ico">{done ? <ClipboardCheck size={20} /> : <CalendarClock size={20} />}</span>
                  <span>
                    <h3>{unit}</h3>
                    <p>Visita em {v?.date ? day(v.date) : "—"}</p>
                  </span>
                </Link>
                <div className="pcard-chips">
                  <span className={`badge ${done ? "shared" : late ? "private" : ""}`}>
                    {done ? "Realizada" : late ? "Atrasada" : "Agendada"}
                  </span>
                  {(v?.professionals ?? []).map((p) => <span key={p} className="chip">{p}</span>)}
                </div>
                {done && v?.responded_at && (
                  <span style={{ color: "var(--muted)", fontSize: 13.5 }}>
                    Respondida por {v.responded_by || "—"} em {new Date(v.responded_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
                <AccessLine ownerName={r.owner} shared={r.meta.shared} />
                <FiscActions
                  id={r.id} done={done} nome={`${unit} – ${v?.date ? day(v.date) : ""}`}
                  canDelete={isOwner || me.role === "admin"} canShare={isOwner || me.role === "admin"}
                  shared={r.meta.shared} people={shareable.filter((p) => !r.meta.shared.some((s) => s.id === p.id) && p.id !== r.owner_id)}
                />
                <RecordActivity history={r.meta.history} createdAt={r.created_at} ownerName={r.owner} label="Agendou a fiscalização" showCreated={false} />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
