import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { loadRecord } from "@/lib/records";
import { previousTexts } from "@/lib/acomp";
import { AcompForm } from "@/components/AcompForm";
import { ProcessPicker } from "@/components/ProcessPicker";

// Formulário do Relatório de acompanhamento e reavaliação. Ao salvar, o relatório aparece em Processos.
export default async function AcompanhamentoPage({ searchParams }: { searchParams: Promise<{ processo?: string }> }) {
  await requireMember();
  const { processo } = await searchParams;
  const { data } = await createAdminClient().from("intake_records")
    .select("id, nomes:answers->nomes->>value, numero:answers->processo->>value")
    .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
  const options = (data ?? []).map((r) => ({
    id: r.id as string, label: `${(r.nomes as string) || "(sem nome)"} — Processo ${(r.numero as string) || "—"}`,
  }));

  const rec = processo ? await loadRecord(processo) : null;
  const n = rec ? Math.max(0, ...rec.meta.acomps.map((a) => a.n)) + 1 : 1;
  const a = rec?.answers;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div>
        <h1 style={{ margin: "8px 0 0" }}>Relatório de acompanhamento e reavaliação</h1>
        <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
          Preencha o formulário. Ao salvar, o relatório é gerado no padrão do NUPS e fica em Processos, para você editar.
        </p>
      </div>

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
        key={rec?.id ?? "novo"} id={rec?.id ?? ""} n={null} initial={{}} redo={false}
        previous={rec ? previousTexts(rec.answers, rec.meta, n) : {}}
      />
    </div>
  );
}
