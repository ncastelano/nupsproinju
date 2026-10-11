import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";
import { Avatar } from "@/components/Avatar";
import { metaOf, type RecMeta } from "@/lib/records";
import { listDocs } from "@/lib/documents";
import { AccessLine, RecordActivity } from "@/components/RecordActivity";
import { FollowupActions } from "@/components/FollowupActions";
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
          admin.from("members").select("id, name"),
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
  // um cartão por acompanhamento (um formulário pode ter vários, um por reavaliação)
  const entries = records.flatMap((r) => {
    const all = metaOf(r.answers as Record<string, unknown>).followups;
    const list = all.length ? all : r.followup ? [{ at: r.followup_at ?? r.created_at, answers: r.followup }] : [];
    return list.map((f) => ({ r, f }));
  }).sort((a, b) => b.f.at.localeCompare(a.f.at));

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
                  <a href={`/cadastrados/${r.id}/relatorio`}><button type="button" className="ghost">Baixar</button></a>
                </div>
                <RecordActivity history={r.meta.history} createdAt={r.created_at} ownerName={r.owner} />
              </article>
            ))}
          </div>
        </>
      )}

      {showA && <h2 className="section" style={{ margin: 0 }}>ACOMPANHAMENTOS ({entries.length})</h2>}
      {showA && (entries.length === 0 ? (
        <div className="card empty"><p>Nenhum acompanhamento preenchido ainda.</p></div>
      ) : (
        <div className="user-grid">
          {entries.map(({ r, f }, i) => (
            <article key={`${r.id}-${f.at}-${i}`} className="card user-card clickable">
              <h3><Link href={`/cadastrados/${r.id}/documento`} className="stretch">{r.answers.nomes?.value ?? "(sem nome)"}</Link></h3>
              <p>Reavaliação {f.answers.acomp_2?.value ? formatDate(f.answers.acomp_2.value) : new Date(f.at).toLocaleDateString("pt-BR")}</p>
              {f.answers.acomp_1?.value && <p>{f.answers.acomp_1.value}</p>}
              <p>Proc. {r.answers.processo?.value ?? "—"}</p>
              {mine && (
                <div className="row" style={{ marginTop: 8 }}>
                  <FollowupActions recordId={r.id} at={f.at} nome={r.answers.nomes?.value ?? "(sem nome)"} />
                </div>
              )}
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}
