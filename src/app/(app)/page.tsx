import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildNarrative, type AcolhimentoRow } from "@/lib/narrative";
import { AppShell } from "@/components/AppShell";
import type { FormQuestion } from "@/components/QuestionEditor";

type Row = AcolhimentoRow & { professional_name: string; professional_registry: string };

export default async function Home() {
  const m = await requireMember();
  const supabase = await createClient();
  const [{ data: rows }, { data: qs }] = await Promise.all([
    supabase.from("acolhimentos").select("*").order("created_at", { ascending: false }),
    supabase.from("form_questions").select("*").order("position"),
  ]);

  const cards = ((rows ?? []) as Row[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    process_number: r.process_number,
    children_names: r.children_names,
    text: buildNarrative(
      r,
      [r.professional_name, r.professional_registry].filter(Boolean).join(", "),
    ),
  }));

  const name = m.name || m.email;
  return (
    <AppShell
      name={name}
      email={m.email}
      isAdmin={m.role === "admin"}
      avatarUrl={m.avatar_url}
      registry={m.registry}
      professional={{ name, registry: m.registry }}
      cards={cards}
      questions={(qs ?? []) as FormQuestion[]}
    />
  );
}
