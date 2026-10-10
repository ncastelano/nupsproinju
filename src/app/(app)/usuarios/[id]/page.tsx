import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardPen, FileText, FolderOpen, Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { MODEL_VALUES } from "@/lib/modelRecord";
import { formatDate } from "@/components/RecordView";
import { Avatar } from "@/components/Avatar";

type Answers = Record<string, { label: string; value: string }>;
type Rec = { id: string; answers: Answers; followup: Answers | null; followup_at: string | null; created_at: string };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const mine = id === me.id;
  if (!mine && me.role !== "admin") redirect(`/usuarios/${me.id}`);

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
  let records = await fetchRecords();

  // Cada pessoa começa com um cadastro de exemplo já salvo.
  if (mine && records.length === 0 && questions.length > 0) {
    const signature = [person.name || person.email, person.registry].filter(Boolean).join(" - ");
    const values: Record<string, string> = { ...MODEL_VALUES, profissional: signature };
    const answers: Answers = {};
    for (const q of questions) if (values[q.key]) answers[q.key] = { label: q.label, value: values[q.key] };
    await supabase.from("intake_records").insert({ form_key: FORM_KEY, created_by: id, answers });
    records = await fetchRecords();
  }

  const first = (person.name || person.email).split(" ")[0];
  const withFollowup = records.filter((r) => r.followup);

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="hero">
        <div className="row" style={{ flexWrap: "nowrap", gap: 14 }}>
          <Avatar url={person.avatar_url ?? null} size={64} />
          <div>
            <h1 style={{ fontSize: 24 }}>{mine ? "Meus formulários" : `Formulários de ${first}`}</h1>
            <p>{person.name || person.email}{person.registry ? ` · ${person.registry}` : ""}</p>
          </div>
        </div>
      </section>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className={personal ? "badge" : "badge off"}>
          {personal ? typeName || `Formulário de ${first}` : "Formulário modelo"}
        </span>
        {mine && (
          <Link href="/cadastrar-pessoa"><button><Plus size={16} /> Novo formulário</button></Link>
        )}
      </div>

      <h2 className="section" style={{ margin: 0 }}>FORMULÁRIOS ({records.length})</h2>
      {records.length === 0 ? (
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
      )}

      <h2 className="section" style={{ margin: 0 }}>ACOMPANHAMENTOS ({withFollowup.length})</h2>
      {withFollowup.length === 0 ? (
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
      )}
    </div>
  );
}
