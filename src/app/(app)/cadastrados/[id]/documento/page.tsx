import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Download } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";

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

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>{rec.answers.nomes?.value ?? "Processo"}</h1>
          <span style={{ color: "var(--muted)" }}>Processo {rec.answers.processo?.value ?? "—"}</span>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link href={`/cadastrados/${id}`}><button className="ghost"><ClipboardList size={16} /> Ficha e acompanhamentos</button></Link>
          <a href={`/cadastrados/${id}/relatorio`}><button className="ghost"><Download size={16} /> Baixar .docx</button></a>
        </div>
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={acc.canEdit} />
    </div>
  );
}
