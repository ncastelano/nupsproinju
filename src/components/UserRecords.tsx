import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";
import { Avatar } from "@/components/Avatar";
import { metaOf, type RecMeta } from "@/lib/records";
import { listDocs } from "@/lib/documents";
import { AcompCard, FiscCard, MiniCard } from "@/components/ProcessCards";
import { FISC_KEY } from "@/lib/fisc";
import { RecordActions } from "@/components/RecordActions";
import { ReportSearch } from "@/components/ReportSearch";

type Answers = Record<string, { label: string; value: string }>;
type Rec = { id: string; answers: Answers; followup: Answers | null; followup_at: string | null; created_at: string };

// Seção com título, contagem, "Ver todos" e os cartões em grade (no máximo 4 por linha).
function Block({ title, count, all, full, empty, children, q }: {
  title: string; count: number; all: string; full: boolean; empty: React.ReactNode; children: React.ReactNode; q: string;
}) {
  return (
    <section className="grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="section" style={{ margin: 0 }}>{title} ({count})</h2>
        {!full && count > 0 && <Link href={q ? `${all}?q=${encodeURIComponent(q)}` : all} className="see-all">Ver todos ({count})</Link>}
      </div>
      <ReportSearch value={q} />
      {count === 0 ? <div className="card empty">{q ? <p>Nada encontrado para “{q}”.</p> : empty}</div> : <div className="user-grid four">{children}</div>}
    </section>
  );
}

// Lista de formulários e/ou acompanhamentos de uma pessoa (cada aba mostra a sua parte).
export type ListKind = "cadastros" | "acompanhamentos" | "fiscalizacoes";
const LIMIT = 4;

export async function UserRecords({ id, view, only, q = "" }: { id: string; view: "formularios" | "acompanhamentos" | "todos"; only?: ListKind; q?: string }) {
  const me = await requireMember();
  const mine = id === me.id;
  if (!mine && me.role !== "admin") redirect("/processos");
  const showF = view !== "acompanhamentos";
  const showA = view !== "formularios";

  const admin = createAdminClient();

  // Todas as pessoas com conta veem todos os processos; na página de uma pessoa (admin), só os dela.
  let recQ = admin.from("intake_records").select("id, created_by, answers, created_at")
    .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
  let fiscQ = admin.from("intake_records").select("id, created_by, created_at, answers")
    .eq("form_key", FISC_KEY).order("created_at", { ascending: false });
  if (!mine) { recQ = recQ.eq("created_by", id); fiscQ = fiscQ.eq("created_by", id); }

  const [personRes, recordsRes, docs, pplRes, fiscRes] = await Promise.all([
    admin.from("members").select("*").eq("id", id).maybeSingle(),
    recQ,
    listDocs(id),
    admin.from("members").select("id, name"),
    showF ? fiscQ : Promise.resolve({ data: [] as { id: string; created_by: string; created_at: string; answers: unknown }[] }),
  ]);

  const person = personRes.data;
  if (!person) notFound();
  const records = (recordsRes.data ?? []) as (Rec & { created_by: string })[];
  const first = (person.name || person.email).split(" ")[0];
  const names = new Map((pplRes.data ?? []).map((p) => [p.id as string, p.name as string]));
  const ownerOf = (uid: string) => names.get(uid) ?? "";
  const canRemove = (uid: string) => uid === me.id || me.role === "admin";

  // acompanhamentos (relatórios de reavaliação) de todos os processos
  const acomps = records.flatMap((r) => {
    const m = metaOf(r.answers as Record<string, unknown>);
    return m.acomps.map((a) => ({
      rid: r.id, nomes: r.answers.nomes?.value ?? "", processo: r.answers.processo?.value ?? "",
      a, meta: m, owner: ownerOf(r.created_by), canDelete: canRemove(r.created_by),
    }));
  }).sort((x, y) => y.a.at.localeCompare(x.a.at));

  // fiscalizações já respondidas
  const fiscs = (fiscRes.data ?? [])
    .map((r) => {
      const ans = (r.answers ?? {}) as Record<string, unknown>;
      return {
        id: r.id as string, owner_id: r.created_by as string, created_at: r.created_at as string,
        meta: metaOf(ans), ans: ans as Answers,
      };
    })
    .filter((r) => r.meta.visit?.status === "realizada" || r.meta.visit?.draft);

  // Busca: acha pelo tipo de relatório e pelo conteúdo (pessoas, datas, nomes, textos...)
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const withBr = (t: string) => t.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1 $1-$2-$3");
  const blob = (parts: (string | undefined | null)[]) => norm(withBr(parts.filter(Boolean).join(" | ")));
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  const hit = (text: string) => tokens.every((t) => text.includes(t));
  const valuesOf = (a: Answers) => Object.entries(a).filter(([k]) => !k.startsWith("_")).map(([, v]) => v?.value);
  const cadBlob = (r: (typeof records)[number]) => {
    const m = metaOf(r.answers as Record<string, unknown>);
    return blob(["cadastro inicial", ...valuesOf(r.answers), ownerOf(r.created_by), r.created_at, ...m.history.map((h) => `${h.by_name} ${h.note ?? ""}`)]);
  };
  const cadList = tokens.length ? records.filter((r) => hit(cadBlob(r))) : records;
  const acompList = tokens.length
    ? acomps.filter((x) => {
        const parent = records.find((r) => r.id === x.rid);
        return hit(blob(["acompanhamento", "reavaliação", parent ? cadBlob(parent) : "", ...Object.values(x.meta.acompData?.[String(x.a.n)] ?? {}), x.a.by_name, x.a.at, x.owner]));
      })
    : acomps;
  const fiscList = tokens.length
    ? fiscs.filter((f) => {
        const v = f.meta.visit;
        return hit(blob(["fiscalização", "fiscalizacao", "unidade", ...valuesOf(f.ans), v?.unit, v?.date, ...(v?.professionals ?? []), v?.responded_by, ownerOf(f.owner_id), f.created_at]));
      })
    : fiscs;
  const shownCad = only ? cadList : cadList.slice(0, LIMIT);

  return (
    <div className="grid" style={{ gap: 16 }}>
      {(only || !mine) && (
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: "8px 0 0" }}>
              {only ? { cadastros: "Cadastros iniciais", acompanhamentos: "Acompanhamentos", fiscalizacoes: "Fiscalizações" }[only]
                : `Relatórios de ${first}`}
            </h1>
            {!only && (
              <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                {person.name || person.email}{person.registry ? ` · ${person.registry}` : ""}.
              </p>
            )}
          </div>
          {only && <Link href="/processos"><button className="ghost"><ArrowLeft size={16} /> Voltar a Relatórios</button></Link>}
        </div>
      )}

      {(["formulario", "acompanhamento"] as const).map((k) => {
        const list = docs.filter((d) => (d.kind ?? "formulario") === k);
        if (list.length === 0 || (k === "formulario" ? !showF : !showA)) return null;
        return (
          <section key={k} className="grid" style={{ gap: 12 }}>
            <h2 className="section" style={{ margin: 0 }}>
              {k === "formulario" ? "PROCESSOS EXPORTADOS" : "ACOMPANHAMENTOS EXPORTADOS"} ({list.length})
            </h2>
            <div className="user-grid">
              {list.map((d) => (
                <article key={d.id} className="card user-card clickable">
                  <h3><Link href={`/documentos/${d.id}`} className="stretch">{d.title}</Link></h3>
                  <p>{d.source === "google" ? "Google Docs" : `Arquivo .${d.ext}`} · {d.chars.toLocaleString("pt-BR")} caracteres</p>
                  <p>Exportado em {new Date(d.created_at).toLocaleDateString("pt-BR")}</p>
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="badge">Documento completo no banco</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}


      {showF && (!only || only === "cadastros") && (
        <Block
          title="CADASTROS INICIAIS" count={cadList.length} q={q} all="/processos/cadastros-iniciais" full={!!only}
          empty={<p>Nenhum cadastro inicial ainda.</p>}
        >
          {shownCad.map((r) => {
            const meta = metaOf(r.answers as Record<string, unknown>);
            const nome = r.answers.nomes?.value ?? "(sem nome)";
            return (
              <MiniCard
                key={r.id}
                href={meta.draft ? `/cadastro-inicial?rascunho=${r.id}` : `/cadastrados/${r.id}/documento`}
                title={nome} line={`Processo ${r.answers.processo?.value ?? "—"}`} draft={!!meta.draft}
              >
                {meta.draft && <RecordActions recordId={r.id} nome={nome} canDelete={canRemove(r.created_by)} draft />}
              </MiniCard>
            );
          })}
        </Block>
      )}

      {showF && (!only || only === "acompanhamentos") && (
        <Block
          title="ACOMPANHAMENTOS" count={acompList.length} q={q} all="/processos/acompanhamentos" full={!!only}
          empty={<p>Nenhum acompanhamento ainda. Preencha o formulário em <Link href="/acompanhamento">Acompanhamento</Link> para gerar o relatório.</p>}
        >
          {(only ? acompList : acompList.slice(0, LIMIT)).map((x) => (
            <AcompCard
              key={`${x.rid}-${x.a.n}`} recordId={x.rid} nomes={x.nomes} processo={x.processo}
              n={x.a.n} by={x.a.by_name} at={x.a.at} canDelete={x.canDelete} draft={!!x.a.draft}
            />
          ))}
        </Block>
      )}

      {showF && (!only || only === "fiscalizacoes") && (
        <Block
          title="FISCALIZAÇÕES" count={fiscList.length} q={q} all="/processos/fiscalizacoes" full={!!only}
          empty={<p>Nenhuma fiscalização realizada ainda. Agende e responda em <Link href="/fiscalizacoes">Fiscalizações</Link>.</p>}
        >
          {(only ? fiscList : fiscList.slice(0, LIMIT)).map((f) => (
            <FiscCard
              key={f.id} id={f.id} unit={f.meta.visit?.unit ?? ""} date={f.meta.visit?.date ?? ""}
              professionals={f.meta.visit?.professionals ?? []} respondedBy={f.meta.visit?.responded_by}
              respondedAt={f.meta.visit?.responded_at} canDelete={canRemove(f.owner_id)}
              draft={f.meta.visit?.status !== "realizada"}
            />
          ))}
        </Block>
      )}
    </div>
  );
}
