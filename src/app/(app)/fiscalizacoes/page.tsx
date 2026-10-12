import Link from "next/link";
import { CalendarClock, ClipboardCheck } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { ModelPanel } from "@/components/ModelPanel";
import { previewOf } from "@/lib/preview";
import { MODELS, modelInfo } from "@/lib/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { metaOf, type RecMeta } from "@/lib/records";
import { FISC_KEY, FISC_SECTIONS, PROFISSIONAIS_PADRAO } from "@/lib/fisc";
import { RecordActivity } from "@/components/RecordActivity";
import { FiscActions } from "@/components/FiscActions";
import { ScheduleVisit } from "@/components/ScheduleVisit";
import { FiscForm } from "@/components/FiscForm";

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
  })).filter((r) => r.meta.visit?.status !== "realizada");

  // mais próximas primeiro: agendadas por data; as realizadas depois, da mais recente
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Porto_Velho" });
  rows.sort((a, b) => {
    const A = a.meta.visit, B = b.meta.visit;
    if (A?.status !== B?.status) return A?.status === "agendada" ? -1 : 1;
    const da = A?.date ?? "", db = B?.date ?? "";
    return A?.status === "agendada" ? da.localeCompare(db) : db.localeCompare(da);
  });

  const people = [...new Set([...PROFISSIONAIS_PADRAO, ...approved.map((p) => p.name as string).filter(Boolean)])];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Fiscalização Mensal de Unidade de Acolhimento</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          Responda o formulário da visita. Ao salvar, o relatório é gerado no padrão do NUPS e fica em <Link href="/processos">Relatórios</Link>, para você editar. Use <b>Salvar rascunho</b> para continuar depois.
        </p>
      </div>

      {me.role === "admin" && (
        <ModelPanel
          kind="fisc" reportTitle={MODELS.fisc.title} note={MODELS.fisc.note} info={await modelInfo("fisc")}
          sections={previewOf(FISC_SECTIONS)} questionnaireNote={"Perguntas do formulário de Fiscalização Mensal de Unidade de Acolhimento. As respostas geram o texto do relatório."}
        />
      )}
      <FiscForm id="" initial={{}} redo={false} />

      <hr className="soft" />
      <h2 className="section" style={{ margin: 0 }}>VISITAS AGENDADAS</h2>
      <p style={{ margin: 0, color: "var(--muted)" }}>Programe uma visita antes e responda o formulário depois, no dia.</p>
      <ScheduleVisit people={people} me={me.name} />

      <h2 className="section" style={{ margin: 0 }}>A RESPONDER ({rows.length})</h2>
      {rows.length === 0 ? (
        <div className="card empty"><p>Nenhuma visita pendente. Agende uma nova visita acima.</p></div>
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
                  {v?.draft && !done
                    ? <span className="badge draft">Rascunho</span>
                    : (
                      <span className={`badge ${done ? "shared" : late ? "private" : ""}`}>
                        {done ? "Realizada" : late ? "Atrasada" : "Agendada"}
                      </span>
                    )}
                  {(v?.professionals ?? []).map((p) => <span key={p} className="chip">{p}</span>)}
                </div>
                {done && v?.responded_at && (
                  <span style={{ color: "var(--muted)", fontSize: 13.5 }}>
                    Respondida por {v.responded_by || "—"} em {new Date(v.responded_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
                <FiscActions
                  id={r.id} done={done} draft={!!v?.draft} nome={`${unit} – ${v?.date ? day(v.date) : ""}`}
                  canDelete={isOwner || me.role === "admin"}
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
