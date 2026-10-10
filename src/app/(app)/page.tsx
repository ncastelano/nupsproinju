import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildNarrative, type AcolhimentoRow } from "@/lib/narrative";
import { AppShell } from "@/components/AppShell";
import type { Professional } from "@/components/ProfileForm";

export default async function Home() {
  const m = await requireMember();
  const supabase = await createClient();

  const [{ data: profs }, { data: taken }, { data: rows }] = await Promise.all([
    supabase.from("professionals").select("id,name,registry").order("name"),
    supabase.from("members").select("professional_id").not("professional_id", "is", null),
    supabase.from("acolhimentos").select("*").order("created_at", { ascending: false }),
  ]);

  const all = (profs ?? []) as Professional[];
  const byId = new Map(all.map((p) => [p.id, p]));
  const takenIds = new Set((taken ?? []).map((t) => t.professional_id as string));
  // quem não é admin só enxerga a própria linha em members; o unique do banco garante o resto
  const available = all.filter((p) => !takenIds.has(p.id));
  const professional = m.professional_id ? byId.get(m.professional_id) ?? null : null;

  const cards = ((rows ?? []) as (AcolhimentoRow & { professional_id: string | null })[]).map((r) => {
    const p = r.professional_id ? byId.get(r.professional_id) : null;
    return {
      id: r.id,
      created_at: r.created_at,
      process_number: r.process_number,
      children_names: r.children_names,
      text: buildNarrative(r, p ? `${p.name}, ${p.registry}` : ""),
    };
  });

  return (
    <AppShell
      name={m.name || m.email}
      email={m.email}
      avatarUrl={m.avatar_url}
      isAdmin={m.role === "admin"}
      professional={professional}
      available={available}
      cards={cards}
    />
  );
}
