import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { AcompActions } from "@/components/AcompActions";
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
  const entry = rec.meta.acomps.find((a) => a.n === n);
  if (!acc.canView || !entry) notFound();
  if (entry.draft) redirect(`/acompanhamento?processo=${id}&n=${n}`);

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
      </div>
      <div className="doc-info">
        <div className="pcard-chips">
          <span className="chip">Criado por {entry.by_name || "—"} em {new Date(entry.at).toLocaleDateString("pt-BR")}</span>
        </div>
        <div className="pcard-actions">
          <Link href={`/cadastrados/${id}/documento`}><button className="ghost"><ClipboardList size={16} /> Cadastro inicial</button></Link>
          <AcompActions id={id} n={n} nome={rec.answers.nomes?.value ?? "(sem nome)"} canDelete={acc.owner || acc.admin} hideOpen after="/processos" />
        </div>
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={acc.canEdit} docRef={ref} backHref="/acompanhamento" />
      <div className="card">
        <RecordActivity history={rec.meta.history.filter((h) => h.doc === `acomp:${n}`)} createdAt={rec.created_at} ownerName={ownerName} label="" limit={6} showCreated={false} />
      </div>
    </div>
  );
}
