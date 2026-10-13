import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { metaOf } from "@/lib/records";
import { MiniCard, brDate } from "@/components/ProcessCards";
import { ReportSearch } from "@/components/ReportSearch";

type Answers = Record<string, { label: string; value: string }>;

// Aba Relatórios: só a lista de processos. Ao abrir um, aparecem todos os relatórios dele.
export async function ProcessList({ q = "" }: { q?: string }) {
  const admin = createAdminClient();
  const [recs, ppl] = await Promise.all([
    admin.from("intake_records").select("id, created_by, answers, created_at").eq("form_key", FORM_KEY).order("created_at", { ascending: false }),
    admin.from("members").select("id, name"),
  ]);
  const names = new Map((ppl.data ?? []).map((p) => [p.id as string, p.name as string]));

  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const withBr = (t: string) => t.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1 $1-$2-$3");
  const tokens = norm(q).split(/\s+/).filter(Boolean);

  const rows = (recs.data ?? []).map((r) => {
    const ans = (r.answers ?? {}) as Record<string, unknown>;
    const a = ans as unknown as Answers;
    const meta = metaOf(ans);
    const reports = (meta.draft ? 0 : 1) + meta.acomps.filter((x) => !x.draft).length;
    const last = [r.created_at as string, ...meta.acomps.map((x) => x.at), ...meta.history.map((h) => h.at)].sort().pop()!;
    const text = norm(withBr([
      "cadastro inicial acompanhamento reavaliação",
      ...Object.entries(a).filter(([k]) => !k.startsWith("_")).map(([, v]) => v?.value),
      names.get(r.created_by as string), r.created_at as string,
      ...meta.history.map((h) => `${h.by_name} ${h.note ?? ""}`),
      ...Object.values(meta.acompData ?? {}).flatMap((d) => Object.values(d)),
    ].filter(Boolean).join(" | ")));
    return { id: r.id as string, numero: a.processo?.value ?? "—", nomes: a.nomes?.value ?? "(sem nome)", draft: !!meta.draft, reports, last, text };
  }).filter((r) => tokens.every((t) => r.text.includes(t)));

  return (
    <section className="grid" style={{ gap: 12 }}>
      <h1 style={{ margin: "8px 0 0" }}>Relatórios</h1>
      <ReportSearch value={q} />
      {rows.length === 0 ? (
        <div className="card empty">{q ? <p>Nada encontrado para “{q}”.</p> : <p>Nenhum processo ainda. Faça o Cadastro inicial para começar.</p>}</div>
      ) : (
        <div className="user-grid four">
          {rows.map((r) => (
            <MiniCard
              key={r.id} href={`/processos/${r.id}`} title={`Processo ${r.numero}`} line={r.nomes} draft={r.draft}
              sub={r.reports === 0 ? "Nenhum relatório gerado ainda" : `${r.reports} ${r.reports === 1 ? "relatório" : "relatórios"} · Último relatório: ${brDate(r.last)}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
