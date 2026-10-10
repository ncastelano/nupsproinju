import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEY } from "@/lib/forms";
import { formatDate } from "@/components/RecordView";

type Answers = Record<string, { label: string; value: string }>;

export default async function CadastradosPage() {
  await requireMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("intake_records").select("id, answers, followup")
    .eq("form_key", FORM_KEY).order("created_at", { ascending: false });
  const list = (data ?? []) as { id: string; answers: Answers; followup: Answers | null }[];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 style={{ margin: "8px 0 0" }}>Cadastrados</h1>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        Abra um cadastrado para ver a ficha dele e compartilhar só aquele registro.
      </p>
      {list.length === 0 ? (
        <div className="card empty">
          <p>Nenhum cadastro ainda. Faça um <Link href="/formulario">novo cadastro</Link>.</p>
        </div>
      ) : (
        <div className="user-grid">
          {list.map((r) => (
            <Link key={r.id} href={`/cadastrados/${r.id}`} className="tile">
              <div className="ico"><FolderOpen size={26} /></div>
              <h3>{r.answers.nomes?.value ?? "(sem nome)"}</h3>
              <p>Proc. {r.answers.processo?.value ?? "—"}</p>
              {r.answers.data_acolhimento?.value && <p>Acolhido em {formatDate(r.answers.data_acolhimento.value)}</p>}
              <span className={r.followup ? "badge" : "badge off"} style={{ marginTop: 8 }}>
                {r.followup ? "Com acompanhamento" : "Sem acompanhamento"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
