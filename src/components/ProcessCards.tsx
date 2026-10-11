import Link from "next/link";

const day = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
};

// Cartão simples: só o nome e o processo. Os detalhes e os botões ficam na página do arquivo.
export { day as brDate };
export function MiniCard({ href, title, line, sub, draft, children }: {
  href: string; title: string; line: string; sub?: string; draft?: boolean; children?: React.ReactNode;
}) {
  return (
    <article className="card pcard mini">
      <Link href={href} className="mini-link">
        <h3>{title}</h3>
        <p>{line}</p>
        {sub && <p className="mini-sub">{sub}</p>}
      </Link>
      {draft && <span className="draft-tag">Rascunho</span>}
      {children}
    </article>
  );
}

// Um acompanhamento (relatório de reavaliação) de um processo.
export function AcompCard({
  recordId, nomes, processo, n, last, draft = false,
}: {
  recordId: string; nomes: string; processo: string; n: number; last?: string; by?: string; at?: string; canDelete?: boolean; draft?: boolean;
}) {
  return (
    <MiniCard
      href={draft ? `/acompanhamento?processo=${recordId}&n=${n}` : `/cadastrados/${recordId}/acompanhamento/${n}`}
      title={`Processo ${processo || "—"}`} line={nomes || "(sem nome)"}
      sub={`Acompanhamento nº ${n}${last ? ` · Último relatório: ${day(last)}` : ""}`} draft={draft}
    >
    </MiniCard>
  );
}

// Uma fiscalização: o relatório gerado (ou o rascunho do questionário).
export function FiscCard({
  id, unit, date, last, draft = false,
}: {
  id: string; unit: string; date: string; last?: string; professionals?: string[]; respondedBy?: string; respondedAt?: string; canDelete?: boolean; draft?: boolean;
}) {
  return (
    <MiniCard
      href={draft ? `/fiscalizacoes/${id}/responder` : `/fiscalizacoes/${id}`}
      title={unit || "(sem unidade)"} line={`Visita em ${date ? day(date) : "—"}`}
      sub={last ? `Último relatório: ${day(last)}` : undefined} draft={draft}
    >
    </MiniCard>
  );
}
