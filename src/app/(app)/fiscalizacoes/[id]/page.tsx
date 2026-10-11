import { notFound, redirect } from "next/navigation";
import { FiscActions } from "@/components/FiscActions";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { FISC_KEY } from "@/lib/fisc";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";
import { RecordActivity } from "@/components/RecordActivity";
import { createAdminClient } from "@/lib/supabase/admin";

// Relatório da fiscalização (gerado das respostas), editável com o padrão do NUPS.
export default async function FiscalizacaoDocPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const rec = await loadRecord(id, FISC_KEY);
  if (!rec) notFound();
  const acc = accessOf(rec, me);
  if (!acc.canView) notFound();
  if (rec.meta.visit?.status !== "realizada") redirect(`/fiscalizacoes/${id}/responder`);

  const ref = { kind: "fisc" } as const;
  const doc = await loadProcessDoc(rec, ref, me);
  if (!doc) {
    return <div className="card"><p className="error">O modelo do documento não está disponível. Peça ao administrador para enviá-lo.</p></div>;
  }
  const data = await parseDocx(doc.buf);
  const v = rec.meta.visit;

  const { data: ownerRow } = await createAdminClient().from("members").select("name").eq("id", rec.created_by).maybeSingle();
  const ownerName = (ownerRow?.name as string) ?? "";
  const ownerNameTop = ownerName;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Fiscalização — {v?.unit}</h1>
          <span style={{ color: "var(--muted)" }}>Visita em {v?.date?.split("-").reverse().join("/")}</span>
        </div>
      </div>
      <div className="doc-info">
        <div className="pcard-chips">
          {(v?.professionals ?? []).map((p) => <span key={p} className="chip">{p}</span>)}
          {v?.responded_by && <span className="chip">Respondida por {v.responded_by}</span>}
          <span className="chip">Criada por {ownerNameTop || "—"} em {new Date(rec.created_at).toLocaleDateString("pt-BR")}</span>
        </div>
        <div className="pcard-actions">
          <FiscActions id={id} done nome={`${v?.unit ?? ""} – ${v?.date?.split("-").reverse().join("/") ?? ""}`} canDelete={acc.owner || acc.admin} hideOpen after="/processos" />
        </div>
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={acc.canEdit} docRef={ref} backHref="/fiscalizacoes" />
      <div className="card">
        <RecordActivity history={rec.meta.history} createdAt={rec.created_at} ownerName={ownerName} label="" limit={6} showCreated={false} />
      </div>
    </div>
  );
}
