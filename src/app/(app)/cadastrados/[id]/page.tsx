import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardPen, FileText } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { RecordView, formatDate } from "@/components/RecordView";
import { ShareMenu } from "@/components/ShareMenu";

type Answers = Record<string, { label: string; value: string }>;

function fmt(a: Answers) {
  const copy = { ...a };
  for (const k of ["data_acolhimento", "acomp_2"]) {
    if (copy[k]) copy[k] = { ...copy[k], value: formatDate(copy[k].value) };
  }
  return copy;
}

// Página de um único cadastrado, própria para compartilhar o link só dele.
// Abre apenas para quem está logado e tem acesso (dono ou administrador).
export default async function CadastradoPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const supabase = await createClient();

  const { data: rec } = await supabase
    .from("intake_records").select("id, created_by, answers, followup")
    .eq("id", id).eq("form_key", FORM_KEY).maybeSingle();
  if (!rec) notFound();

  const owner = rec.created_by as string;
  const cadQs = (await loadQuestions(supabase, FORM_KEY, owner)).questions;
  const acQs = (await loadQuestions(supabase, FORM_ACOMP, owner)).questions;

  const a = rec.answers as Answers;
  const followup = rec.followup as Answers | null;
  const nome = a.nomes?.value ?? "(sem nome)";

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href="/cadastrados" className="row"><ArrowLeft size={16} /> Voltar aos formulários</Link>

      <section className="hero">
        <h1 style={{ fontSize: 24 }}>{nome}</h1>
        <p>Processo {a.processo?.value ?? "—"}{a.unidade?.value ? ` · ${a.unidade.value}` : ""}</p>
      </section>

      <div className="row">
        <ShareMenu
          path={`/cadastrados/${id}`}
          text={`Formulário de ${nome} (Núcleo Psicossocial – VPIJ Porto Velho):`}
          label="Compartilhar este formulário"
          className=""
          note="Só abre para quem estiver logado e tiver acesso a este formulário."
        />
        <Link href={`/banco-de-dados/${id}/resumo`}><button className="ghost"><FileText size={16} /> Resumo A4 / Imprimir</button></Link>
        {rec.created_by === me.id && (
          <Link href={`/cadastrar-pessoa?aba=acompanhamento&acolhido=${id}`}>
            <button className="ghost"><ClipboardPen size={16} /> {followup ? "Editar acompanhamento" : "Preencher acompanhamento"}</button>
          </Link>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Formulário inicial</h2>
        <RecordView answers={fmt(a)} questions={cadQs} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Acompanhamento</h2>
        {followup
          ? <RecordView answers={fmt(followup)} questions={acQs} />
          : <p style={{ color: "var(--muted)", margin: 0 }}>Ainda não preenchido.</p>}
      </div>
    </div>
  );
}
