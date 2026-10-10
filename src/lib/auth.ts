import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Member = {
  id: string; email: string; name: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  professional_id: string | null;
  registry: string;
  avatar_url: string | null;
  profileslug: string;
};

export async function getMember(): Promise<Member | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle();
  if (!data) return null;
  // registro, foto e endereço do perfil ficam nos metadados da conta
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    ...(data as Member),
    registry: meta.registry ?? (data as Member).registry ?? "",
    avatar_url: meta.avatar_url ?? (data as Member).avatar_url ?? null,
    profileslug: meta.profileslug ?? "",
  };
}

// Só passa quem está aprovado; pendente/recusado vai pra tela de status.
export async function requireMember() {
  const m = await getMember();
  if (!m) redirect("/login");
  if (m.status !== "approved") redirect("/acesso");
  return m;
}

export async function requireAdmin() {
  const m = await requireMember();
  if (m.role !== "admin") redirect("/");
  return m;
}
