"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanSlug, isSlugTaken, slugError } from "@/lib/profiles";

export async function updateProfile(_: string | null, form: FormData) {
  const me = await requireMember();
  const name = String(form.get("name") ?? "").trim();
  const slug = cleanSlug(String(form.get("profileslug") ?? ""));
  const registry = String(form.get("registry") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm_password") ?? "");

  if (!name) return "Informe o seu nome.";
  if (slug) {
    const err = slugError(slug);
    if (err) return err;
    if (slug !== me.profileslug && (await isSlugTaken(slug, me.id))) return "Esse endereço de perfil já está em uso.";
  }
  if (!registry) return "Informe o seu CRP ou CRESS.";
  if (password || confirm) {
    if (password.length < 6) return "A nova senha precisa ter pelo menos 6 caracteres.";
    if (password !== confirm) return "A confirmação não é igual à nova senha.";
  }

  const admin = createAdminClient();
  const { data: cur } = await admin.auth.admin.getUserById(me.id);
  const { error: e1 } = await admin.auth.admin.updateUserById(me.id, {
    user_metadata: { ...(cur.user?.user_metadata ?? {}), registry, profileslug: slug },
    ...(password ? { password } : {}),
  });
  if (e1) return `Não foi possível salvar o perfil (${e1.message}).`;
  const { error: e2 } = await admin.from("members").update({ name }).eq("id", me.id);
  if (e2) return `Não foi possível salvar o nome (${e2.message}).`;

  revalidatePath("/", "layout");
  return "ok";
}

export async function uploadAvatar(form: FormData) {
  const me = await requireMember();
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) return "Escolha uma imagem.";
  if (!file.type.startsWith("image/")) return "O arquivo precisa ser uma imagem.";
  if (file.size > 1_500_000) return "Imagem muito grande.";

  const admin = createAdminClient();
  const path = `${me.id}/${Date.now()}.jpg`;
  const body = Buffer.from(await file.arrayBuffer());
  let { error } = await admin.storage.from("avatars").upload(path, body, { contentType: "image/jpeg" });
  if (error) {
    // primeira foto do projeto: cria o espaço de fotos e tenta de novo
    await admin.storage.createBucket("avatars", { public: true });
    ({ error } = await admin.storage.from("avatars").upload(path, body, { contentType: "image/jpeg" }));
  }
  if (error) return `Não foi possível enviar a foto (${error.message}).`;

  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  const { data: cur } = await admin.auth.admin.getUserById(me.id);
  const { error: e2 } = await admin.auth.admin.updateUserById(me.id, {
    user_metadata: { ...(cur.user?.user_metadata ?? {}), avatar_url: data.publicUrl },
  });
  if (e2) return "Não foi possível salvar a foto no perfil.";
  revalidatePath("/", "layout");
  return "ok";
}
