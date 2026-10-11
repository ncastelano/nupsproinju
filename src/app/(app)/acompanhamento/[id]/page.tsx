import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { previousTexts } from "@/lib/acomp";
import { AcompForm } from "@/components/AcompForm";

// Questionário do acompanhamento e reavaliação de um processo (novo, ou ?n=N para editar as respostas).
export default async function AcompanhamentoQuestionario(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string }> },
) {
  const me = await requireMember();
  const { id } = await params;
  const { n: nRaw } = await searchParams;
  const rec = await loadRecord(id);
  if (!rec) notFound();
  if (!accessOf(rec, me).canEdit) notFound();

  const editing = nRaw !== undefined ? Number(nRaw) : null;
  if (editing !== null && !rec.meta.acomps.some((a) => a.n === editing)) notFound();
  const n = editing ?? Math.max(0, ...rec.meta.acomps.map((a) => a.n)) + 1;
  const initial = editing !== null ? rec.meta.acompData?.[String(editing)] ?? {} : {};
  const a = rec.answers;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Acompanhamento nº {n}</h1>
          <span style={{ color: "var(--muted)" }}>Relatório de acompanhamento e reavaliação</span>
        </div>
        <Link href="/acompanhamento"><button className="ghost"><ArrowLeft size={16} /> Voltar</button></Link>
      </div>

      <div className="card grid" style={{ gap: 4 }}>
        <strong>{a.nomes?.value ?? "(sem nome)"}</strong>
        <span style={{ color: "var(--muted)" }}>Processo {a.processo?.value ?? "—"}{a.unidade?.value ? ` · ${a.unidade.value}` : ""}</span>
        <span className="help">A identificação (nomes, nascimentos, genitores, unidade, profissionais e assinatura) vem do Cadastro inicial.</span>
      </div>

      <AcompForm id={id} n={editing} initial={initial} previous={previousTexts(rec.answers, rec.meta, n)} redo={editing !== null} />
    </div>
  );
}
