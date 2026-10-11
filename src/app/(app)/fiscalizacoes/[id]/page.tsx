import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardPen, Download } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { FISC_KEY } from "@/lib/fisc";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";

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

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Fiscalização — {v?.unit}</h1>
          <span style={{ color: "var(--muted)" }}>Visita em {v?.date?.split("-").reverse().join("/")}</span>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {acc.canEdit && <Link href={`/fiscalizacoes/${id}/responder`}><button className="ghost"><ClipboardPen size={16} /> Editar respostas</button></Link>}
          <a href={`/fiscalizacoes/${id}/baixar`}><button className="ghost"><Download size={16} /> Baixar .docx</button></a>
        </div>
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={acc.canEdit} docRef={ref} backHref="/fiscalizacoes" />
    </div>
  );
}
