import { requireMember } from "@/lib/auth";
import { ModelCard } from "@/components/ModelCard";
import { MODELS, modelInfo } from "@/lib/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { loadRecord } from "@/lib/records";
import { previousTexts } from "@/lib/acomp";
import { AcompForm } from "@/components/AcompForm";
import { ProcessPicker } from "@/components/ProcessPicker";
import { DiscardDraft } from "@/components/DiscardDraft";

// Formulário do Relatório de acompanhamento e reavaliação. Ao salvar, o relatório aparece em Processos.
export default async function AcompanhamentoPage({ searchParams }: { searchParams: Promise<{ processo?: string; n?: string }> }) {
  const me = await requireMember();
  const { processo, n: nRaw } = await searchParams;
  const { data } = await createAdminClient().from("intake_records")
    .select("id, meta:answers->_meta, nomes:answers->nomes->>value, numero:answers->processo->>value")
    .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
  // cadastro inicial ainda em rascunho não tem processo para acompanhar
  const options = (data ?? []).filter((r) => !(r.meta as { draft?: boolean } | null)?.draft).map((r) => ({
    id: r.id as string, label: `${(r.nomes as string) || "(sem nome)"} — Processo ${(r.numero as string) || "—"}`,
  }));

  const rec = processo ? await loadRecord(processo) : null;
  // ?n=N continua um rascunho de acompanhamento
  const draftN = rec && nRaw ? rec.meta.acomps.find((a) => a.n === Number(nRaw) && a.draft)?.n ?? null : null;
  const n = draftN ?? (rec ? Math.max(0, ...rec.meta.acomps.map((a) => a.n)) + 1 : 1);
  const a = rec?.answers;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Relatório de acompanhamento e reavaliação</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          Preencha e salve o formulário para gerar o relatório conforme o modelo do NUPS. O documento ficará disponível na seção Relatórios para revisão e edição.
        </p>
      </div>

      <ModelCard kind="acomp" title={MODELS.acomp.title} note={MODELS.acomp.note} info={await modelInfo("acomp")} canEdit={me.role === "admin"} />
      <div className="card q">
        <label className="q-label">Processo <span className="req">*</span></label>
        {options.length === 0 ? (
          <p className="error">
            Ainda não há nenhum processo. O acompanhamento é feito sobre um Cadastro inicial (o mesmo número de processo): faça o{" "}
            <a href="/cadastro-inicial">Cadastro inicial</a> primeiro.
          </p>
        ) : (
          <ProcessPicker options={options} value={rec?.id ?? ""} />
        )}
        <span className="help">Só é possível fazer o acompanhamento de um processo que já tem Cadastro inicial.</span>
        {a && (
          <span className="help">
            Acompanhamento nº {n} · {a.unidade?.value ?? ""}. A identificação (nomes, nascimentos, genitores, unidade, profissionais e assinatura) vem do Cadastro inicial.
          </span>
        )}
      </div>

      <AcompForm
        key={`${rec?.id ?? "novo"}-${draftN ?? ""}`} id={rec?.id ?? ""} n={draftN}
        initial={draftN !== null ? rec?.meta.acompData?.[String(draftN)] ?? {} : {}} redo={false}
        previous={rec ? previousTexts(rec.answers, rec.meta, n) : {}}
      />
      {rec && draftN !== null && <div><DiscardDraft kind="acompanhamento" id={rec.id} n={draftN} /></div>}
    </div>
  );
}
