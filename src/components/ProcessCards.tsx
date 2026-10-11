import Link from "next/link";
import { AcompActions } from "@/components/AcompActions";
import { FiscActions } from "@/components/FiscActions";

const day = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

// Cartão simples: só o nome e o processo. Os detalhes e os botões ficam na página do arquivo.
export function MiniCard({ href, title, line, draft, children }: {
  href: string; title: string; line: string; draft?: boolean; children?: React.ReactNode;
}) {
  return (
    <article className="card pcard mini">
      <Link href={href} className="mini-link">
        <h3>{title}</h3>
        <p>{line}</p>
      </Link>
      {draft && <span className="badge draft">Rascunho</span>}
      {children}
    </article>
  );
}

// Um acompanhamento (relatório de reavaliação) de um processo.
export function AcompCard({
  recordId, nomes, processo, n, canDelete, draft = false,
}: {
  recordId: string; nomes: string; processo: string; n: number; by?: string; at?: string; canDelete: boolean; draft?: boolean;
}) {
  return (
    <MiniCard
      href={draft ? `/acompanhamento?processo=${recordId}&n=${n}` : `/cadastrados/${recordId}/acompanhamento/${n}`}
      title={nomes || "(sem nome)"} line={`Acompanhamento nº ${n} · Processo ${processo || "—"}`} draft={draft}
    >
      {draft && <AcompActions id={recordId} n={n} nome={nomes || "(sem nome)"} canDelete={canDelete} draft />}
    </MiniCard>
  );
}

// Uma fiscalização: o relatório gerado (ou o rascunho do questionário).
export function FiscCard({
  id, unit, date, canDelete, draft = false,
}: {
  id: string; unit: string; date: string; professionals?: string[]; respondedBy?: string; respondedAt?: string; canDelete: boolean; draft?: boolean;
}) {
  return (
    <MiniCard
      href={draft ? `/fiscalizacoes/${id}/responder` : `/fiscalizacoes/${id}`}
      title={unit || "(sem unidade)"} line={`Visita em ${date ? day(date) : "—"}`} draft={draft}
    >
      {draft && <FiscActions id={id} done={false} draft nome={`${unit} – ${date ? day(date) : ""}`} canDelete={canDelete} />}
    </MiniCard>
  );
}
