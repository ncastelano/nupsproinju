import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, History, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_ACOMP, FORM_KEY } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { accessOf, loadRecord, type Ans } from "@/lib/records";
import { RecordView, formatDate } from "@/components/RecordView";
import { ShareMenu } from "@/components/ShareMenu";
import { RecordSection } from "@/components/RecordSection";
import { deleteRecord, shareRecord, unshareRecord } from "../records-actions";

function fmt(a: Ans | null): Ans | null {
  if (!a) return null;
  const copy = { ...a };
  for (const k of ["data_acolhimento", "acomp_2"]) {
    if (copy[k]) copy[k] = { ...copy[k], value: formatDate(copy[k].value) };
  }
  return copy;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Ficha de um formulário: quem tem acesso pode ver, editar ali mesmo e compartilhar o link.
export default async function CadastradoPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const rec = await loadRecord(id);
  if (!rec) notFound();
  const acc = accessOf(rec, me);
  if (!acc.canView) notFound();

  const supabase = await createClient();
  const [cad, ac] = await Promise.all([
    loadQuestions(supabase, FORM_KEY, rec.created_by),
    loadQuestions(supabase, FORM_ACOMP, rec.created_by),
  ]);

  const admin = createAdminClient();
  const { data: owner } = await admin.from("members").select("name, email").eq("id", rec.created_by).maybeSingle();
  const ownerName = (owner?.name as string) || (owner?.email as string) || "—";

  let people: { id: string; name: string }[] = [];
  if (acc.canShare) {
    const { data } = await admin.from("members").select("id, name, email").eq("status", "approved").order("name");
    const taken = new Set([rec.created_by, ...rec.meta.shared.map((s) => s.id)]);
    people = (data ?? [])
      .filter((m) => !taken.has(m.id as string))
      .map((m) => ({ id: m.id as string, name: (m.name as string) || (m.email as string) }));
  }

  const nome = rec.answers.nomes?.value ?? "(sem nome)";
  const editors = Object.entries(rec.meta.editing).filter(([uid]) => uid !== me.id);

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href="/processos" className="row"><ArrowLeft size={16} /> Voltar aos processos</Link>

      <section className="hero">
        <h1 style={{ fontSize: 24 }}>{nome}</h1>
        <p>Processo {rec.answers.processo?.value ?? "—"}{rec.answers.unidade?.value ? ` · ${rec.answers.unidade.value}` : ""}</p>
        <div className="hero-meta">
          <span>Preenchido por {ownerName}</span>
          {rec.meta.shared.length > 0 && <span>· compartilhado com {rec.meta.shared.map((s) => s.name).join(", ")}</span>}
        </div>
        {(editors.length > 0 || rec.meta.editing[me.id]) && (
          <div className="editing-now">
            <Pencil size={14} />
            {[...(rec.meta.editing[me.id] ? [["você", rec.meta.editing[me.id]] as const] : []), ...editors.map(([, v]) => [v.name, v] as const)]
              .map(([n, v]) => `${n} (${v.scope === "acompanhamento" ? "acompanhamento" : "formulário"})`)
              .join(", ")} editando agora
          </div>
        )}
      </section>

      <div className="row">
        <ShareMenu
          path={`/cadastrados/${id}`}
          text={`Cadastro inicial de ${nome} (Núcleo Psicossocial – VPIJ Porto Velho):`}
          label="Compartilhar o link"
          className=""
          note="Só abre para quem estiver logado e tiver acesso a este formulário."
        />
        <a href={`/cadastrados/${id}/relatorio`}><button className="ghost"><Download size={16} /> Baixar relatório (.docx)</button></a>
        <Link href={`/banco-de-dados/${id}/resumo`}><button className="ghost"><FileText size={16} /> Resumo A4 / Imprimir</button></Link>
        {(acc.owner || acc.admin) && (
          <form action={deleteRecord} id="del-record">
            <input type="hidden" name="record_id" value={id} />
            <button className="danger" formNoValidate><Trash2 size={16} /> Apagar este formulário</button>
          </form>
        )}
      </div>

      {acc.canShare && (
        <div className="card grid" style={{ gap: 10 }}>
          <strong><UserPlus size={16} style={{ verticalAlign: "-3px" }} /> Quem pode editar</strong>
          <span style={{ color: "var(--muted)" }}>
            Escolha uma pessoa para ela abrir este link e editar o formulário e o acompanhamento. Todas as alterações ficam registradas com o nome de quem alterou.
          </span>
          {rec.meta.shared.map((s) => (
            <form key={s.id} action={unshareRecord} className="qrow">
              <input type="hidden" name="record_id" value={id} />
              <input type="hidden" name="member_id" value={s.id} />
              <strong>{s.name}</strong>
              <button className="danger" aria-label={`Remover ${s.name}`}><X size={16} /></button>
            </form>
          ))}
          {people.length > 0 && (
            <form action={shareRecord} className="row">
              <input type="hidden" name="record_id" value={id} />
              <select name="member_id" defaultValue="" required>
                <option value="" disabled>Escolher pessoa...</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button>Dar acesso para editar</button>
            </form>
          )}
        </div>
      )}

      <RecordSection
        recordId={id} scope="formulario" title="Cadastro inicial" canEdit={acc.canEdit}
        raw={rec.answers} view={fmt(rec.answers)} questions={cad.questions}
        emptyText="Ainda não preenchido."
      />
      <RecordSection
        recordId={id} scope="acompanhamento" title="Acompanhamento" canEdit={acc.canEdit}
        raw={rec.followup} view={fmt(rec.followup)} questions={ac.questions}
        emptyText="Ainda não preenchido."
      />

      {rec.meta.followups.length > 1 && (
        <div className="card grid" style={{ gap: 10 }}>
          <h2 style={{ margin: 0 }}>Acompanhamentos anteriores ({rec.meta.followups.length - 1})</h2>
          {[...rec.meta.followups].reverse().slice(1).map((f, i) => (
            <details key={`${f.at}-${i}`} className="hist-det">
              <summary>
                Reavaliação {f.answers.acomp_2?.value ? formatDate(f.answers.acomp_2.value) : new Date(f.at).toLocaleDateString("pt-BR")}
                {f.answers.acomp_1?.value ? ` · ${f.answers.acomp_1.value}` : ""}
              </summary>
              <div style={{ marginTop: 10 }}><RecordView answers={fmt(f.answers)!} questions={ac.questions} /></div>
            </details>
          ))}
        </div>
      )}

      <div className="card grid" style={{ gap: 10 }}>
        <h2 style={{ margin: 0 }}><History size={18} style={{ verticalAlign: "-3px" }} /> Alterações</h2>
        {rec.meta.history.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>Nenhuma alteração depois do preenchimento inicial.</p>
        ) : rec.meta.history.map((h, i) => (
          <div key={i} className="hist">
            <div>
              <strong>{h.by_name}</strong>{" "}
              {h.note ?? `alterou o ${h.scope === "acompanhamento" ? "acompanhamento" : "cadastro inicial"}`}
              <span className="hist-when"> · {when(h.at)}</span>
            </div>
            {h.changes.map((c, j) => (
              <div key={j} className="hist-line">
                <b>{c.label}</b>
                <span className="from">{c.from || "(vazio)"}</span>
                <span className="arrow">→</span>
                <span className="to">{c.to || "(vazio)"}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
