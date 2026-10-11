import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Download } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";
import { RecordActivity } from "@/components/RecordActivity";
import { createAdminClient } from "@/lib/supabase/admin";

// Relatório de acompanhamento e reavaliação: o modelo do NUPS, editável na tela.
export default async function AcompanhamentoDocPage({ params }: { params: Promise<{ id: string; n: string }> }) {
  const me = await requireMember();
  const { id, n: nRaw } = await params;
  const n = Number(nRaw);
  const rec = await loadRecord(id);
  if (!rec || !Number.isInteger(n)) notFound();
  const acc = accessOf(rec, me);
  if (!acc.canView || !rec.meta.acomps.some((a) => a.n === n)) notFound();

  const ref = { kind: "acomp", n } as const;
  const doc = await loadProcessDoc(rec, ref, me);
  if (!doc) {
    return <div className="card"><p className="error">O modelo do acompanhamento não está disponível. Peça ao administrador para enviá-lo.</p></div>;
  }
  const data = await parseDocx(doc.buf);

  const { data: ownerRow } = await createAdminClient().from("members").select("name").eq("id", rec.created_by).maybeSingle();
  const ownerName = (ownerRow?.name as string) ?? "";

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Acompanhamento nº {n}</h1>
          <span style={{ color: "var(--muted)" }}>{rec.answers.nomes?.value ?? "Processo"} · Processo {rec.answers.processo?.value ?? "—"}</span>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link href={`/cadastrados/${id}`}><button className="ghost"><ClipboardList size={16} /> Ficha do processo</button></Link>
          <a href={`/cadastrados/${id}/acompanhamento/${n}/baixar`}><button className="ghost"><Download size={16} /> Baixar .docx</button></a>
        </div>
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={acc.canEdit} docRef={ref} backHref="/acompanhamento" />
      <div className="card">
        <RecordActivity history={rec.meta.history.filter((h) => h.doc === `acomp:${n}`)} createdAt={rec.created_at} ownerName={ownerName} label="" limit={6} showCreated={false} />
      </div>
    </div>
  );
}
