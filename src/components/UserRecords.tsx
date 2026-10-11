import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, FileText, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";
import { Avatar } from "@/components/Avatar";
import { metaOf, type RecMeta } from "@/lib/records";
import { listDocs } from "@/lib/documents";
import { AccessLine, RecordActivity } from "@/components/RecordActivity";
import { AcompCard, FiscCard } from "@/components/ProcessCards";
import { FISC_KEY } from "@/lib/fisc";
import { RecordActions } from "@/components/RecordActions";
import { ModeloRelatorio } from "@/components/ModeloRelatorio";

type Answers = Record<string, { label: string; value: string }>;
type Rec = { id: string; answers: Answers; followup: Answers | null; followup_at: string | null; created_at: string };

// Lista de formulários e/ou acompanhamentos de uma pessoa (cada aba mostra a sua parte).
export async function UserRecords({ id, view }: { id: string; view: "formularios" | "acompanhamentos" | "todos" }) {
  const me = await requireMember();
  const mine = id === me.id;
  if (!mine && me.role !== "admin") redirect("/processos");
  const showF = view !== "acompanhamentos";
  const showA = view !== "formularios";

  const admin = createAdminClient();
  const supabase = await createClient();

  // tudo em paralelo: cada ida ao banco custa tempo; só buscamos o que a página mostra
  const [personRes, recordsRes, docs, shared] = await Promise.all([
    admin.from("members").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("intake_records").select("id, answers, followup, followup_at, created_at")
      .eq("form_key", FORM_KEY).eq("created_by", id).order("created_at", { ascending: false }),
    listDocs(id),
    mine && showF
      ? Promise.all([
          // só o necessário das fichas dos outros (sem as respostas inteiras)
          admin.from("intake_records")
            .select("id, created_by, created_at, meta:answers->_meta, nomes:answers->nomes->>value, processo:answers->processo->>value")
            .eq("form_key", FORM_KEY).neq("created_by", id),
          admin.from("members").select("id, name, status"),
          // fiscalizações (visitas) de qualquer pessoa; filtramos as minhas e as compartilhadas comigo
          admin.from("intake_records")
            .select("id, created_by, created_at, meta:answers->_meta")
            .eq("form_key", FISC_KEY).order("created_at", { ascending: false }),
        ])
      : Promise.resolve(null),
  ]);

  const person = personRes.data;
  if (!person) notFound();
  const records = (recordsRes.data ?? []) as Rec[];
  const first = (person.name || person.email).split(" ")[0];

  // formulários de outras pessoas que foram compartilhados comigo para editar
  let sharedWithMe: { id: string; nomes: string; processo: string; owner: string; created_at: string; meta: RecMeta }[] = [];
  if (shared) {
    const [{ data: all }, { data: ppl }] = shared;
    const names = new Map((ppl ?? []).map((p) => [p.id as string, p.name as string]));
    sharedWithMe = (all ?? [])
      .filter((r) => ((r.meta as { shared?: { id: string }[] } | null)?.shared ?? []).some((x) => x.id === id))
      .map((r) => ({
        id: r.id as string, nomes: (r.nomes as string) ?? "", processo: (r.processo as string) ?? "",
        owner: names.get(r.created_by as string) ?? "", created_at: r.created_at as string,
        meta: metaOf({ _meta: r.meta ?? {} }),
      }));
  }
  // acompanhamentos (relatórios de reavaliação) dos meus cadastros e dos compartilhados comigo
  const acomps = [
    ...records.flatMap((r) => {
      const m = metaOf(r.answers as Record<string, unknown>);
      return m.acomps.map((a) => ({
        rid: r.id, nomes: r.answers.nomes?.value ?? "", processo: r.answers.processo?.value ?? "",
        a, meta: m, owner: person.name || person.email, canDelete: true,
      }));
    }),
    ...sharedWithMe.flatMap((r) => r.meta.acomps.map((a) => ({
      rid: r.id, nomes: r.nomes, processo: r.processo, a, meta: r.meta, owner: r.owner, canDelete: me.role === "admin",
    }))),
  ].sort((x, y) => y.a.at.localeCompare(x.a.at));

  // fiscalizações realizadas (minhas ou compartilhadas comigo)
  const approved = ((shared?.[1].data ?? []) as { id: string; name: string; status: string }[]).filter((p) => p.status === "approved");
  const shareable = approved.filter((p) => p.id !== id).map((p) => ({ id: p.id, name: p.name || "(sem nome)" }));
  const nameOf = new Map(approved.map((p) => [p.id, p.name]));
  const fiscs = (shared?.[2].data ?? [])
    .map((r) => ({
      id: r.id as string, owner_id: r.created_by as string, created_at: r.created_at as string,
      meta: metaOf({ _meta: r.meta ?? {} }),
    }))
    .filter((r) => r.meta.visit?.status === "realizada" && (r.owner_id === id || r.meta.shared.some((x) => x.id === id)));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>
          {view === "formularios" ? (mine ? "Processos" : `Processos de ${first}`)
            : view === "acompanhamentos" ? (mine ? "Acompanhamentos" : `Acompanhamentos de ${first}`)
            : `Processos de ${first}`}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          {mine
            ? view === "acompanhamentos"
              ? "Os acompanhamentos que você preencheu. Toque em um para abrir a ficha completa."
              : "Os processos cadastrados pelo Cadastro inicial. Toque em um para abrir a ficha completa."
            : `${person.name || person.email}${person.registry ? ` · ${person.registry}` : ""}. Toque em um item para abrir a ficha completa.`}
        </p>
      </div>
      {mine && (
        <div className="row">
          {showF && <Link href="/cadastro-inicial"><button><Plus size={16} /> Novo cadastro inicial</button></Link>}
        </div>
      )}
      </div>

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

      {mine && showF && <ModeloRelatorio canEdit={me.role === "admin"} />}

      {showF && <h2 className="section" style={{ margin: 0 }}>CADASTROS INICIAIS ({records.length})</h2>}
      {showF && (records.length === 0 ? (
        <div className="card empty"><p>Nenhum cadastro inicial ainda.</p></div>
      ) : (
        <div className="user-grid wide">
          {records.map((r) => {
            const meta = metaOf(r.answers as Record<string, unknown>);
            const nome = r.answers.nomes?.value ?? "(sem nome)";
            const ownerName = person.name || person.email;
            return (
              <article key={r.id} className="card pcard">
                <Link href={`/cadastrados/${r.id}/documento`} className="pcard-head">
                  <span className="pcard-ico"><FileText size={20} /></span>
                  <span>
                    <h3>{nome}</h3>
                    <p>Processo {r.answers.processo?.value ?? "—"}</p>
                  </span>
                </Link>
                <div className="pcard-chips">
                  {r.answers.unidade?.value && <span className="chip">{r.answers.unidade.value}</span>}
                  {r.answers.modalidade?.value && <span className="chip">{r.answers.modalidade.value}</span>}
                  {r.answers.data_acolhimento?.value && <span className="chip">Acolhido em {formatDate(r.answers.data_acolhimento.value)}</span>}
                  <span className="chip">{meta.acomps.length} {meta.acomps.length === 1 ? "acompanhamento" : "acompanhamentos"}</span>
                </div>
                <span style={{ color: "var(--muted)", fontSize: 13.5 }}>
                  Criado por {ownerName} em {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </span>
                <AccessLine ownerName={ownerName} shared={meta.shared} />
                <div className="pcard-actions">
                  <RecordActions recordId={r.id} nome={nome} canDelete={mine || me.role === "admin"} />
                </div>
                <RecordActivity history={meta.history} createdAt={r.created_at} ownerName={ownerName} />
              </article>
            );
          })}
        </div>
      ))}

      {showF && sharedWithMe.length > 0 && (
        <>
          <h2 className="section" style={{ margin: 0 }}>COMPARTILHADOS COMIGO ({sharedWithMe.length})</h2>
          <div className="user-grid wide">
            {sharedWithMe.map((r) => (
              <article key={r.id} className="card pcard">
                <Link href={`/cadastrados/${r.id}/documento`} className="pcard-head">
                  <span className="pcard-ico"><FileText size={20} /></span>
                  <span>
                    <h3>{r.nomes || "(sem nome)"}</h3>
                    <p>Processo {r.processo || "—"}</p>
                  </span>
                </Link>
                <AccessLine ownerName={r.owner} shared={r.meta.shared} />
                <div className="pcard-actions">
                  <Link href={`/cadastrados/${r.id}/documento`}><button type="button"><FileText size={16} /> Abrir</button></Link>
                  <a href={`/cadastrados/${r.id}/relatorio`}><button type="button" className="ghost"><Download size={16} /> Baixar</button></a>
                </div>
                <RecordActivity history={r.meta.history} createdAt={r.created_at} ownerName={r.owner} />
              </article>
            ))}
          </div>
        </>
      )}

      {showF && <h2 className="section" style={{ margin: 0 }}>ACOMPANHAMENTOS ({acomps.length})</h2>}
      {showF && (acomps.length === 0 ? (
        <div className="card empty">
          <p>Nenhum acompanhamento ainda. Responda o questionário em <Link href="/acompanhamento">Acompanhamento</Link> para gerar o relatório.</p>
        </div>
      ) : (
        <div className="user-grid wide">
          {acomps.map((x) => (
            <AcompCard
              key={`${x.rid}-${x.a.n}`} recordId={x.rid} nomes={x.nomes} processo={x.processo}
              n={x.a.n} by={x.a.by_name} at={x.a.at} meta={x.meta} ownerName={x.owner} canDelete={x.canDelete}
            />
          ))}
        </div>
      ))}

      {showF && <h2 className="section" style={{ margin: 0 }}>FISCALIZAÇÕES ({fiscs.length})</h2>}
      {showF && (fiscs.length === 0 ? (
        <div className="card empty">
          <p>Nenhuma fiscalização realizada ainda. Agende e responda em <Link href="/fiscalizacoes">Fiscalizações</Link>.</p>
        </div>
      ) : (
        <div className="user-grid wide">
          {fiscs.map((f) => (
            <FiscCard
              key={f.id} id={f.id} unit={f.meta.visit?.unit ?? ""} date={f.meta.visit?.date ?? ""}
              professionals={f.meta.visit?.professionals ?? []} respondedBy={f.meta.visit?.responded_by}
              respondedAt={f.meta.visit?.responded_at} meta={f.meta} ownerName={nameOf.get(f.owner_id) ?? ""}
              createdAt={f.created_at} canDelete={f.owner_id === id || me.role === "admin"}
              people={shareable.filter((p) => p.id !== f.owner_id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
