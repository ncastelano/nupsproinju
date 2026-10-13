import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { loadRecord } from "@/lib/records";
import { MiniCard, brDate } from "@/components/ProcessCards";

// Um processo: todos os relatórios gerados para ele (cadastro inicial e acompanhamentos), cada um com a data
// em que foi gerado (a do envio do formulário).
export default async function ProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  const rec = await loadRecord(id);
  if (!rec) notFound();
  const nomes = rec.answers.nomes?.value ?? "(sem nome)";
  const numero = rec.answers.processo?.value ?? "—";

  const done = (doc: string, starts: string) =>
    rec.meta.history.filter((h) => h.doc === doc && (h.note ?? "").startsWith(starts)).map((h) => h.at).sort().pop();
  const cadDate = done("inicial", "concluiu o cadastro inicial") ?? rec.created_at;
  const acomps = [...rec.meta.acomps].sort((a, b) => a.n - b.n);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "8px 0 0" }}>Processo {numero}</h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>{nomes}</p>
        </div>
        <div className="row">
          {!rec.meta.draft && <Link href={`/acompanhamento?processo=${id}`}><button><Plus size={16} /> Novo acompanhamento</button></Link>}
          <Link href="/processos"><button className="ghost"><ArrowLeft size={16} /> Voltar a Relatórios</button></Link>
        </div>
      </div>

      <div className="user-grid four">
        <MiniCard
          href={rec.meta.draft ? `/cadastro-inicial?rascunho=${id}` : `/cadastrados/${id}/documento`}
          title={`Cadastro inicial · ${brDate(cadDate)}`} line={nomes} sub={`Processo ${numero}`} draft={!!rec.meta.draft}
        />
        {acomps.map((a) => {
          const at = done(`acomp:${a.n}`, "criou o acompanhamento") ?? a.at;
          return (
            <MiniCard
              key={a.n}
              href={a.draft ? `/acompanhamento?processo=${id}&n=${a.n}` : `/cadastrados/${id}/acompanhamento/${a.n}`}
              title={`Acompanhamento nº ${a.n} · ${brDate(at)}`} line={nomes} sub={`Processo ${numero}`} draft={!!a.draft}
            />
          );
        })}
      </div>
    </div>
  );
}
