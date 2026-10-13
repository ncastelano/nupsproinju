import Link from "next/link";
import { CheckCircle2, FileText, Paperclip, Circle, Plus } from "lucide-react";

const day = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
};

// Cartão simples: só o nome e o processo. Os detalhes e os botões ficam na página do arquivo.
export { day as brDate };
export function MiniCard({ href, title, line, sub, draft, tag, children }: {
  href: string; title: string; line: string; sub?: string; draft?: boolean; tag?: string; children?: React.ReactNode;
}) {
  return (
    <article className="card pcard mini">
      <Link href={href} className="mini-link">
        <h3>{title}</h3>
        <p>{line}</p>
        {sub && <p className="mini-sub">{sub}</p>}
      </Link>
      {(draft || tag) && <span className="draft-tag">{tag ?? "Rascunho"}</span>}
      {children}
    </article>
  );
}

// Cartão de processo: o número do processo em destaque (sem nomes) e o que cada processo já tem.
type Badge = { text: string; tone: "ok" | "none" | "brand"; icon?: "check" | "none" | "clip" };
export function ProcCard({ href, kicker, numero, badges = [], foot, draft = false }: {
  href: string; kicker: string; numero: string; badges?: Badge[]; foot?: string; draft?: boolean;
}) {
  return (
    <article className="card proc-card">
      <Link href={href} className="proc-link">
        <span className="proc-ico"><FileText size={20} /></span>
        <span className="proc-body">
          <small className="proc-kicker">{kicker}</small>
          <strong className="proc-num">{numero}</strong>
          {badges.length > 0 && (
            <span className="proc-badges">
              {badges.map((b) => (
                <span key={b.text} className={`proc-badge ${b.tone}`}>
                  {b.icon === "check" ? <CheckCircle2 size={13} /> : b.icon === "clip" ? <Paperclip size={13} /> : <Circle size={13} />}
                  {b.text}
                </span>
              ))}
            </span>
          )}
          {foot && <span className="proc-foot">{foot}</span>}
        </span>
      </Link>
      {draft && <span className="draft-tag">Rascunho</span>}
    </article>
  );
}

// Processo de acompanhamento: o Cadastro inicial e os acompanhamentos (anexos) juntos, num cartão só.
export function ProcessoCard({ id, numero, draft = false, cadDate, acomps }: {
  id: string; numero: string; draft?: boolean; cadDate: string; acomps: { n: number; date: string; draft: boolean }[];
}) {
  const done = acomps.filter((a) => !a.draft).length;
  return (
    <article className="card proc-card proc-multi">
      <div className="proc-top">
        <span className="proc-ico"><FileText size={20} /></span>
        <span className="proc-body">
          <small className="proc-kicker">Processo de acompanhamento</small>
          <strong className="proc-num">{numero || "—"}</strong>
        </span>
      </div>
      {!draft && (
        <span className="proc-badges">
          {done > 0
            ? <span className="proc-badge ok"><CheckCircle2 size={13} /> {done === 1 ? "Com acompanhamento" : `Com ${done} acompanhamentos`}</span>
            : <span className="proc-badge none"><Circle size={13} /> Sem acompanhamento</span>}
        </span>
      )}
      <ul className="proc-files">
        <li>
          <Link href={draft ? `/cadastro-inicial?rascunho=${id}` : `/cadastrados/${id}/documento`}>
            <FileText size={14} /> <span>Cadastro inicial</span> <em>{day(cadDate)}</em>
          </Link>
          {draft && <span className="proc-draft">Rascunho</span>}
        </li>
        {acomps.map((a) => (
          <li key={a.n}>
            <Link href={a.draft ? `/acompanhamento?processo=${id}&n=${a.n}` : `/cadastrados/${id}/acompanhamento/${a.n}`}>
              <Paperclip size={14} /> <span>Acompanhamento nº {a.n}</span> <em>{day(a.date)}</em>
            </Link>
            {a.draft && <span className="proc-draft">Rascunho</span>}
          </li>
        ))}
      </ul>
      {!draft && <Link href={`/acompanhamento?processo=${id}`} className="proc-add"><Plus size={14} /> Novo acompanhamento</Link>}
    </article>
  );
}

// Cadastro inicial de um processo: mostra se já tem ou não acompanhamento (o acompanhamento é anexo do cadastro).
export function CadastroCard({ id, numero, draft = false, acomps, last }: {
  id: string; numero: string; draft?: boolean; acomps: number; last?: string;
}) {
  return (
    <ProcCard
      href={draft ? `/cadastro-inicial?rascunho=${id}` : `/cadastrados/${id}/documento`}
      kicker="Cadastro inicial" numero={numero || "—"} draft={draft}
      badges={draft ? [] : acomps > 0
        ? [{ text: acomps === 1 ? "Com acompanhamento" : `Com ${acomps} acompanhamentos`, tone: "ok", icon: "check" }]
        : [{ text: "Sem acompanhamento", tone: "none", icon: "none" }]}
      foot={last ? `Último relatório: ${day(last)}` : undefined}
    />
  );
}

// Um acompanhamento (relatório de reavaliação): anexo do cadastro inicial do processo.
export function AcompCard({
  recordId, processo, n, last, draft = false,
}: {
  recordId: string; nomes?: string; processo: string; n: number; last?: string; by?: string; at?: string; canDelete?: boolean; draft?: boolean;
}) {
  return (
    <ProcCard
      href={draft ? `/acompanhamento?processo=${recordId}&n=${n}` : `/cadastrados/${recordId}/acompanhamento/${n}`}
      kicker={`Acompanhamento nº ${n}`} numero={processo || "—"} draft={draft}
      badges={[{ text: "Anexo do cadastro inicial", tone: "brand", icon: "clip" }]}
      foot={last ? `Último relatório: ${day(last)}` : undefined}
    />
  );
}

// Uma fiscalização: o relatório gerado (ou o rascunho do questionário).
export function FiscCard({
  id, unit, date, last, draft = false, processes = [],
}: {
  id: string; unit: string; date: string; last?: string; professionals?: string[]; respondedBy?: string; respondedAt?: string; canDelete?: boolean; draft?: boolean; processes?: string[];
}) {
  return (
    <ProcCard
      href={draft ? `/fiscalizacoes/${id}/responder` : `/fiscalizacoes/${id}`}
      kicker="Fiscalização" numero={processes.length ? processes.join(" · ") : unit || "(sem unidade)"} draft={draft}
      badges={[
        ...(processes.length && unit ? [{ text: unit, tone: "brand" as const, icon: "clip" as const }] : []),
        ...(!processes.length ? [{ text: "Sem número de processo", tone: "none" as const, icon: "none" as const }] : []),
      ]}
      foot={`Visita em ${date ? day(date) : "—"}${last ? ` · Último relatório: ${day(last)}` : ""}`}
    />
  );
}
