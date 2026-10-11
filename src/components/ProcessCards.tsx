import Link from "next/link";
import { ClipboardCheck, FileText } from "lucide-react";
import { AcompActions } from "@/components/AcompActions";
import { FiscActions } from "@/components/FiscActions";

const day = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

// Um acompanhamento (relatório de reavaliação) de um processo.
export function AcompCard({
  recordId, nomes, processo, n, by, at, canDelete, draft = false,
}: {
  recordId: string; nomes: string; processo: string; n: number; by: string; at: string; canDelete: boolean; draft?: boolean;
}) {
  return (
    <article className="card pcard">
      <Link href={draft ? `/acompanhamento?processo=${recordId}&n=${n}` : `/cadastrados/${recordId}/acompanhamento/${n}`} className="pcard-head">
        <span className="pcard-ico"><FileText size={20} /></span>
        <span>
          <h3>{nomes || "(sem nome)"}</h3>
          <p>Acompanhamento nº {n} · Processo {processo || "—"}</p>
        </span>
      </Link>
      {draft && <span className="badge draft">Rascunho</span>}
      <span className="pcard-by">Criado por {by || "—"} em {new Date(at).toLocaleDateString("pt-BR")}</span>
      <AcompActions id={recordId} n={n} nome={nomes || "(sem nome)"} canDelete={canDelete} draft={draft} />
    </article>
  );
}

// Uma fiscalização já respondida: o relatório gerado e as atividades.
export function FiscCard({
  id, unit, date, professionals, respondedBy, respondedAt, canDelete, draft = false,
}: {
  id: string; unit: string; date: string; professionals: string[]; respondedBy?: string; respondedAt?: string; canDelete: boolean; draft?: boolean;
}) {
  return (
    <article className="card pcard">
      <Link href={draft ? `/fiscalizacoes/${id}/responder` : `/fiscalizacoes/${id}`} className="pcard-head">
        <span className="pcard-ico"><ClipboardCheck size={20} /></span>
        <span>
          <h3>{unit || "(sem unidade)"}</h3>
          <p>Visita em {date ? day(date) : "—"}</p>
        </span>
      </Link>
      <div className="pcard-chips">
        {draft ? <span className="badge draft">Rascunho</span> : <span className="badge shared">Realizada</span>}
        {professionals.slice(0, 2).map((p) => <span key={p} className="chip">{p}</span>)}
        {professionals.length > 2 && <span className="chip">+{professionals.length - 2}</span>}
      </div>
      {respondedAt && (
        <span className="pcard-by">
          Respondida por {respondedBy || "—"} em {new Date(respondedAt).toLocaleDateString("pt-BR")}
        </span>
      )}
      <FiscActions id={id} done={!draft} draft={draft} nome={`${unit} – ${date ? day(date) : ""}`} canDelete={canDelete} />
    </article>
  );
}
