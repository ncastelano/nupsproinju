import Link from "next/link";
import { ClipboardCheck, FileText } from "lucide-react";
import type { RecMeta } from "@/lib/records";
import { AcompActions } from "@/components/AcompActions";
import { FiscActions } from "@/components/FiscActions";
import { RecordActivity } from "@/components/RecordActivity";

const day = (iso: string) => { const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

// Um acompanhamento (relatório de reavaliação) de um processo.
export function AcompCard({
  recordId, nomes, processo, n, by, at, meta, ownerName, canDelete,
}: {
  recordId: string; nomes: string; processo: string; n: number; by: string; at: string;
  meta: RecMeta; ownerName: string; canDelete: boolean;
}) {
  return (
    <article className="card pcard">
      <Link href={`/cadastrados/${recordId}/acompanhamento/${n}`} className="pcard-head">
        <span className="pcard-ico"><FileText size={20} /></span>
        <span>
          <h3>{nomes || "(sem nome)"}</h3>
          <p>Acompanhamento nº {n} · Processo {processo || "—"}</p>
        </span>
      </Link>
      <span style={{ color: "var(--muted)", fontSize: 13.5 }}>Criado por {by || "—"} em {new Date(at).toLocaleDateString("pt-BR")}</span>
      <AcompActions id={recordId} n={n} nome={nomes || "(sem nome)"} canDelete={canDelete} />
      <RecordActivity history={meta.history.filter((h) => h.doc === `acomp:${n}`)} createdAt={at} ownerName={by} showCreated={false} />
    </article>
  );
}

// Uma fiscalização já respondida: o relatório gerado e as atividades.
export function FiscCard({
  id, unit, date, professionals, respondedBy, respondedAt, meta, ownerName, createdAt, canDelete,
}: {
  id: string; unit: string; date: string; professionals: string[]; respondedBy?: string; respondedAt?: string;
  meta: RecMeta; ownerName: string; createdAt: string; canDelete: boolean;
}) {
  return (
    <article className="card pcard">
      <Link href={`/fiscalizacoes/${id}`} className="pcard-head">
        <span className="pcard-ico"><ClipboardCheck size={20} /></span>
        <span>
          <h3>{unit || "(sem unidade)"}</h3>
          <p>Visita em {date ? day(date) : "—"}</p>
        </span>
      </Link>
      <div className="pcard-chips">
        <span className="badge shared">Realizada</span>
        {professionals.map((p) => <span key={p} className="chip">{p}</span>)}
      </div>
      {respondedAt && (
        <span style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Respondida por {respondedBy || "—"} em {new Date(respondedAt).toLocaleDateString("pt-BR")}
        </span>
      )}
      <FiscActions id={id} done nome={`${unit} – ${date ? day(date) : ""}`} canDelete={canDelete} />
      <RecordActivity history={meta.history} createdAt={createdAt} ownerName={ownerName} showCreated={false} />
    </article>
  );
}
