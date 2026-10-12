import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { RecordActions } from "@/components/RecordActions";
import { formatDate } from "@/components/RecordView";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";
import { RecordActivity } from "@/components/RecordActivity";
import { Collaborators } from "@/components/Collaborators";
import { AudioPanel } from "@/components/AudioPanel";
import { createAdminClient } from "@/lib/supabase/admin";

// O documento do processo: o modelo do NUPS preenchido, editável na tela com o mesmo padrão do arquivo.
export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const rec = await loadRecord(id);
  if (!rec) notFound();
  const acc = accessOf(rec, me);
  if (!acc.canView) notFound();

  const doc = await loadProcessDoc(rec);
  if (!doc) {
    return <div className="card"><p className="error">O modelo do relatório não está disponível. Peça ao administrador para enviá-lo.</p></div>;
  }
  const data = await parseDocx(doc.buf);

  const { data: ownerRow } = await createAdminClient().from("members").select("name").eq("id", rec.created_by).maybeSingle();
  const ownerName = (ownerRow?.name as string) ?? "";
  const ownerNameTop = ownerName;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>{rec.answers.nomes?.value ?? "Processo"}</h1>
          <span style={{ color: "var(--muted)" }}>Processo {rec.answers.processo?.value ?? "—"}</span>
        </div>
      </div>
      <DocEditor viewFirst key={doc.version} id={id} data={data} version={doc.version} canEdit={acc.canEdit} author={me.name || me.email}  editExtra={<>
            <Collaborators rec={rec} doc="inicial" canShare={acc.canShare} />
            <div className="card">
              <AudioPanel recordId={id} doc={"inicial"} audios={(rec.meta.audios ?? []).filter((a) => a.doc === "inicial")} canEdit={acc.canEdit} me={me.id} />
            </div>
          </>}
      />
      <div className="doc-info">
        <div className="pcard-actions">
          <Link href={`/cadastrados/${id}`}><button className="ghost"><ClipboardList size={16} /> Ficha e acompanhamentos</button></Link>
          <RecordActions recordId={id} nome={rec.answers.nomes?.value ?? "(sem nome)"} canDelete={acc.owner || acc.admin} hideOpen after="/processos" />
        </div>
      </div>
      <div className="card grid" style={{ gap: 14 }}>
          <div className="pcard-chips">
            {rec.answers.data_acolhimento?.value && <span className="chip">Acolhido em {formatDate(rec.answers.data_acolhimento.value)}</span>}
            <span className="chip">{rec.meta.acomps.filter((a) => !a.draft).length} {rec.meta.acomps.filter((a) => !a.draft).length === 1 ? "acompanhamento" : "acompanhamentos"}</span>
            <span className="chip">Criado por {ownerNameTop || "—"} em {new Date(rec.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        <RecordActivity history={rec.meta.history.filter((h) => !h.doc || h.doc === "inicial")} createdAt={rec.created_at} ownerName={ownerName} label="Criou o cadastro inicial" limit={6} showCreated={true} />
      </div>
    </div>
  );
}
