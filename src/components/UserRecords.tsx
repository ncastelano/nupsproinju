import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardPen, FileText, FolderOpen, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { formatDate } from "@/components/RecordView";
import { Avatar } from "@/components/Avatar";
import { metaOf } from "@/lib/records";
import { listDocs } from "@/lib/documents";
import { ImportProcess } from "@/components/ImportProcess";

type Answers = Record<string, { label: string; value: string }>;
type Rec = { id: string; answers: Answers; followup: Answers | null; followup_at: string | null; created_at: string };

// Lista de formulários e/ou acompanhamentos de uma pessoa (cada aba mostra a sua parte).
export async function UserRecords({ id, view }: { id: string; view: "formularios" | "acompanhamentos" | "todos" }) {
  const me = await requireMember();
  const mine = id === me.id;
  if (!mine && me.role !== "admin") redirect(view === "acompanhamentos" ? "/acompanhamentos" : "/formularios");
  const showF = view !== "acompanhamentos";
  const showA = view !== "formularios";

  const { data: person } = await createAdminClient()
    .from("members").select("*").eq("id", id).maybeSingle();
  if (!person) notFound();

  const supabase = await createClient();
  const { questions, personal, typeName } = await loadQuestions(supabase, FORM_KEY, id);

  const fetchRecords = async () => {
    const { data } = await supabase
      .from("intake_records").select("id, answers, followup, followup_at, created_at")
      .eq("form_key", FORM_KEY).eq("created_by", id).order("created_at", { ascending: false });
    return (data ?? []) as Rec[];
  };
  const records = await fetchRecords();

  const first = (person.name || person.email).split(" ")[0];
  const docs = await listDocs(id);

  // formulários de outras pessoas que foram compartilhados comigo para editar
  let sharedWithMe: { id: string; answers: Answers; owner: string }[] = [];
  if (mine) {
    const admin = createAdminClient();
    const [{ data: all }, { data: ppl }] = await Promise.all([
      admin.from("intake_records").select("id, created_by, answers").eq("form_key", FORM_KEY).neq("created_by", id),
      admin.from("members").select("id, name"),
    ]);
    const names = new Map((ppl ?? []).map((p) => [p.id as string, p.name as string]));
    sharedWithMe = (all ?? [])
      .filter((r) => metaOf(r.answers as Record<string, unknown>).shared.some((s) => s.id === id))
      .map((r) => ({ id: r.id as string, answers: r.answers as Answers, owner: names.get(r.created_by as string) ?? "" }));
  }
  const withFollowup = records.filter((r) => r.followup);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>
          {view === "formularios" ? (mine ? "Formulários" : `Formulários de ${first}`)
            : view === "acompanhamentos" ? (mine ? "Acompanhamentos" : `Acompanhamentos de ${first}`)
            : `Formulários e acompanhamentos de ${first}`}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          {mine
            ? view === "acompanhamentos"
              ? "Os acompanhamentos que você preencheu. Toque em um para abrir a ficha completa."
              : "Os formulários que você preencheu. Toque em um para abrir a ficha completa."
            : `${person.name || person.email}${person.registry ? ` · ${person.registry}` : ""}. Toque em um item para abrir a ficha completa.`}
        </p>
      </div>

      {mine && (
        <div className="user-grid">
          {showF && <ImportProcess kind="formulario" />}
          {showA && <ImportProcess kind="acompanhamento" />}
        </div>
      )}

      {(["formulario", "acompanhamento"] as const).map((k) => {
        const list = docs.filter((d) => (d.kind ?? "formulario") === k);
        if (list.length === 0 || (k === "formulario" ? !showF : !showA)) return null;
        return (
          <section key={k} className="grid" style={{ gap: 12 }}>
            <h2 className="section" style={{ margin: 0 }}>
              {k === "formulario" ? "FORMULÁRIOS EXPORTADOS" : "ACOMPANHAMENTOS EXPORTADOS"} ({list.length})
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

      {showF && <h2 className="section" style={{ margin: 0 }}>FORMULÁRIOS ({records.length})</h2>}
      {showF && (records.length === 0 ? (
        <div className="card empty"><p>Nenhum formulário ainda.</p></div>
      ) : (
        <div className="user-grid">
          {records.map((r) => (
            <article key={r.id} className="card user-card clickable">
              <h3><Link href={`/cadastrados/${r.id}`} className="stretch">{r.answers.nomes?.value ?? "(sem nome)"}</Link></h3>
              <p>Proc. {r.answers.processo?.value ?? "—"}</p>
              {r.answers.unidade?.value && <p>{r.answers.unidade.value}</p>}
              {r.answers.data_acolhimento?.value && <p>Acolhido em {formatDate(r.answers.data_acolhimento.value)}</p>}
              <div className="row" style={{ marginTop: 6 }}>
                <span className={r.followup ? "badge" : "badge off"}>
                  {r.followup ? "Com acompanhamento" : "Sem acompanhamento"}
                </span>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <Link href={`/cadastrados/${r.id}`}><button className="ghost"><FolderOpen size={16} /> Ficha</button></Link>
                {mine && (
                  <Link href={`/cadastrar-pessoa?aba=acompanhamento&acolhido=${r.id}`}>
                    <button className="ghost"><ClipboardPen size={16} /> Acompanhar</button>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ))}

      {showF && sharedWithMe.length > 0 && (
        <>
          <h2 className="section" style={{ margin: 0 }}>COMPARTILHADOS COMIGO ({sharedWithMe.length})</h2>
          <div className="user-grid">
            {sharedWithMe.map((r) => (
              <article key={r.id} className="card user-card clickable">
                <h3><Link href={`/cadastrados/${r.id}`} className="stretch">{r.answers.nomes?.value ?? "(sem nome)"}</Link></h3>
                <p>Proc. {r.answers.processo?.value ?? "—"}</p>
                <p>Compartilhado por {r.owner || "—"}</p>
                <div className="row" style={{ marginTop: 6 }}>
                  <span className="badge">Você pode editar</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {showA && <h2 className="section" style={{ margin: 0 }}>ACOMPANHAMENTOS ({withFollowup.length})</h2>}
      {showA && (withFollowup.length === 0 ? (
        <div className="card empty"><p>Nenhum acompanhamento preenchido ainda.</p></div>
      ) : (
        <div className="user-grid">
          {withFollowup.map((r) => (
            <article key={r.id} className="card user-card clickable">
              <h3><Link href={`/cadastrados/${r.id}`} className="stretch">{r.answers.nomes?.value ?? "(sem nome)"}</Link></h3>
              <p>
                Reavaliação {r.followup?.acomp_2?.value ? formatDate(r.followup.acomp_2.value) : "—"}
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                <Link href={`/cadastrados/${r.id}`}><button className="ghost"><FileText size={16} /> Ver acompanhamento</button></Link>
                <Link href={`/banco-de-dados/${r.id}/resumo`}><button className="ghost">Resumo A4</button></Link>
              </div>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}
