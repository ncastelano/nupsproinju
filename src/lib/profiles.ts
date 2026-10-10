import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// Páginas que já existem e não podem virar endereço de perfil.
export const RESERVED_SLUGS = [
  "login", "cadastro", "acesso", "formulario", "cadastrar-pessoa", "modelos-de-formularios", "banco-de-dados", "usuarios", "cadastrados",
  "perfil", "api", "admin", "administrador", "icon", "apple-icon", "favicon", "_next",
];

export function cleanSlug(raw: string) {
  return raw
    .trim().toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function slugError(slug: string) {
  if (slug.length < 3) return "O endereço do perfil precisa ter pelo menos 3 letras ou números.";
  if (slug.length > 30) return "O endereço do perfil pode ter no máximo 30 caracteres.";
  if (RESERVED_SLUGS.includes(slug)) return "Esse endereço já é usado pelo sistema. Escolha outro.";
  return null;
}

type AuthUser = { id: string; user_metadata?: Record<string, unknown> | null };

// Perfis ficam nos metadados da conta (registro, foto, endereço), então a busca percorre as contas.
export const listAuthUsers = cache(async (): Promise<AuthUser[]> => {
  const admin = createAdminClient();
  const all: AuthUser[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = (data?.users ?? []) as AuthUser[];
    all.push(...users);
    if (users.length < 200) break;
  }
  return all;
});

export async function findBySlug(slug: string) {
  const users = await listAuthUsers();
  const u = users.find((x) => x.user_metadata?.profileslug === slug);
  if (!u) return null;
  const { data: m } = await createAdminClient()
    .from("members").select("id, name, status").eq("id", u.id).maybeSingle();
  if (!m || m.status !== "approved") return null;
  return {
    id: u.id,
    name: (m.name as string) || "",
    registry: String(u.user_metadata?.registry ?? ""),
    avatarUrl: (u.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

export async function isSlugTaken(slug: string, exceptId: string) {
  const users = await listAuthUsers();
  return users.some((u) => u.id !== exceptId && u.user_metadata?.profileslug === slug);
}

// Quem ainda não escolheu endereço ganha um padrão (baseado no nome), que pode trocar depois.
export async function ensureSlug(me: { id: string; name: string; email: string; profileslug: string }) {
  if (me.profileslug) return me.profileslug;
  const users = await listAuthUsers();
  const taken = new Set(users.filter((u) => u.id !== me.id).map((u) => String(u.user_metadata?.profileslug ?? "")));
  let base = cleanSlug(me.name || me.email.split("@")[0]).slice(0, 26).replace(/-$/, "");
  if (slugError(base)) base = `perfil-${me.id.slice(0, 6)}`;
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;

  const admin = createAdminClient();
  const { data: cur } = await admin.auth.admin.getUserById(me.id);
  await admin.auth.admin.updateUserById(me.id, {
    user_metadata: { ...(cur.user?.user_metadata ?? {}), profileslug: slug },
  });
  return slug;
}

// CRESS = Assistente Social, CRP = Psicólogo(a).
export function professionOf(registry: string) {
  const r = registry.toUpperCase();
  if (r.includes("CRESS")) return "Assistente Social";
  if (r.includes("CRP")) return "Psicólogo(a)";
  return "Equipe técnica";
}
