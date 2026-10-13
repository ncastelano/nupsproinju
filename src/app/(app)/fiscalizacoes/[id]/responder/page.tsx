import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { FISC_KEY } from "@/lib/fisc";
import { FiscForm } from "@/components/FiscForm";
import { loadSections } from "@/lib/questionnaires";
import { DiscardDraft } from "@/components/DiscardDraft";

// Questionário da visita (Fiscalização Mensal de Unidade de Acolhimento).
export default async function ResponderPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const rec = await loadRecord(id, FISC_KEY);
  if (!rec) notFound();
  const acc = accessOf(rec, me);
  if (!acc.canEdit) notFound();

  const v = rec.meta.visit;
  const initial = Object.fromEntries(Object.entries(rec.answers).map(([k, a]) => [k, a.value]));
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Fiscalização Mensal de Unidade de Acolhimento</h1>
          <span style={{ color: "var(--muted)" }}>{v?.unit} · visita em {v?.date?.split("-").reverse().join("/")}</span>
        </div>
        <Link href="/fiscalizacoes"><button className="ghost"><ArrowLeft size={16} /> Voltar</button></Link>
      </div>
      <FiscForm
        id={id} initial={initial} redo={v?.status === "realizada"} sections={await loadSections("fisc")}
        initialProcess={(v?.processes ?? []).join("; ")}
      />
      {v?.status !== "realizada" && (acc.owner || acc.admin) && <div><DiscardDraft kind="fiscalizacao" id={id} /></div>}
    </div>
  );
}
