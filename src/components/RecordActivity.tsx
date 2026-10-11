import { Eye, Lock, Minus, Plus, Users } from "lucide-react";
import type { HistoryEntry } from "@/lib/records";

const when = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

// Quem pode ver o arquivo: privado (dono e administradores) ou compartilhado com N pessoas.
export function AccessLine({ ownerName, shared }: { ownerName: string; shared: { id: string; name: string }[] }) {
  if (shared.length === 0) {
    return (
      <div className="pcard-access">
        <span className="badge private"><Lock size={13} /> Privado</span>
        <span>Só {ownerName ? <strong>{ownerName}</strong> : "o responsável"} e os administradores veem este arquivo.</span>
      </div>
    );
  }
  const total = shared.length + 1;
  return (
    <div className="pcard-access">
      <span className="badge shared"><Users size={13} /> Compartilhado</span>
      <span>
        <Eye size={13} style={{ verticalAlign: "-2px" }} /> {total} {total === 1 ? "pessoa pode" : "pessoas podem"} ver e editar:{" "}
        <strong>{[ownerName, ...shared.map((s) => s.name)].filter(Boolean).join(", ")}</strong>, além dos administradores.
      </span>
    </div>
  );
}

function Change({ c }: { c: HistoryEntry["changes"][number] }) {
  if (c.label === "Adicionado") return <div className="act-line add"><Plus size={13} /><span>{c.to}</span></div>;
  if (c.label === "Removido") return <div className="act-line del"><Minus size={13} /><span>{c.from}</span></div>;
  return (
    <div className="act-line chg">
      <b>{c.label}</b>
      {c.from && <span className="from">{c.from}</span>}
      <span>→</span>
      <span className="to">{c.to || "(vazio)"}</span>
    </div>
  );
}

// Atividades do arquivo: quem fez o quê e quando, com o que entrou e o que saiu.
export function RecordActivity({
  history, createdAt, ownerName, label = "Criou o cadastro inicial", limit = 3, showCreated = true,
}: { history: HistoryEntry[]; createdAt: string; ownerName: string; label?: string; limit?: number; showCreated?: boolean }) {
  type Ev = { at: string; by: string; text: string; changes: HistoryEntry["changes"] };
  const events: Ev[] = [
    ...history.map((h) => ({
      at: h.at, by: h.by_name,
      text: h.note ?? (h.scope === "acompanhamento" ? "alterou o acompanhamento" : "alterou o cadastro inicial"),
      changes: h.changes,
    })),
    ...(showCreated ? [{ at: createdAt, by: ownerName, text: label.toLowerCase(), changes: [] }] : []),
  ];
  // se o histórico já tem o registro de criação, não repete
  const hasCreate = history.some((h) => /^criou|^agendou/i.test(h.note ?? ""));
  const all = hasCreate ? events.filter((e) => !(showCreated && e.at === createdAt && e.changes.length === 0 && e.text === label.toLowerCase())) : events;
  const shown = all.slice(0, limit);
  const rest = all.slice(limit);

  const row = (e: Ev, i: number) => (
    <li key={`${e.at}-${i}`}>
      <div className="act-head">
        <strong>{e.by || "—"}</strong> {e.text}
        <span className="act-when"> · {when(e.at)}</span>
      </div>
      {e.changes.slice(0, 3).map((c, j) => <Change key={j} c={c} />)}
      {e.changes.length > 3 && (
        <details className="act-more">
          <summary>+ {e.changes.length - 3} alterações</summary>
          {e.changes.slice(3).map((c, j) => <Change key={j} c={c} />)}
        </details>
      )}
    </li>
  );

  return (
    <div className="pcard-activity">
      <h4>Atividades</h4>
      {all.length === 0 && <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>Nenhuma atividade ainda.</p>}
      <ul>{shown.map(row)}</ul>
      {rest.length > 0 && (
        <details className="act-more">
          <summary>Ver as outras {rest.length} atividades</summary>
          <ul>{rest.map((e, i) => row(e, i + limit))}</ul>
        </details>
      )}
    </div>
  );
}
