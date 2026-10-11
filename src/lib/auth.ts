import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { metaStore } from "@/lib/reqcache";
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

export const getMember = cache(async (): Promise<Member | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("members").select("*").eq("id", user.id).maybeSingle();
  if (!data) return null;
  // registro, foto e endereço do perfil ficam nos metadados da conta
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  metaStore().set(user.id, (user.user_metadata ?? {}) as Record<string, unknown>);
  return {
    ...(data as Member),
    registry: meta.registry ?? (data as Member).registry ?? "",
    avatar_url: meta.avatar_url ?? (data as Member).avatar_url ?? null,
    profileslug: meta.profileslug ?? "",
  };
});

// Só passa quem está aprovado; pendente/recusado vai pra tela de status.
export async function requireMember() {
  const m = await getMember();
  if (!m) {
    // volta para o endereço pedido depois de entrar (ex.: link de relatório compartilhado)
    const want = (await headers()).get("x-pathname") ?? "";
    redirect(want && want !== "/" && !want.startsWith("/login") ? `/login?next=${encodeURIComponent(want)}` : "/login");
  }
  if (m.status !== "approved") redirect("/acesso");
  return m;
}

export async function requireAdmin() {
  const m = await requireMember();
  if (m.role !== "admin") redirect("/");
  return m;
}
