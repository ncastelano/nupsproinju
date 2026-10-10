"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(_: string | null, form: FormData) {
  const me = await requireMember();
  const name = String(form.get("name") ?? "").trim();
  const registry = String(form.get("registry") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm_password") ?? "");
  if (!name) return "Informe o seu nome.";
  if (!registry) return "Informe o seu CRP ou CRESS.";
  if (password || confirm) {
    if (password.length < 6) return "A nova senha precisa ter pelo menos 6 caracteres.";
    if (password !== confirm) return "A confirmação não é igual à nova senha.";
  }

  const admin = createAdminClient();
  const { error } = await admin.from("members").update({ name, registry }).eq("id", me.id);
  if (error) return `Não foi possível salvar no banco (${error.message}).`;
  if (password) await admin.auth.admin.updateUserById(me.id, { password });
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
  const { error } = await admin.storage
    .from("avatars")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: "image/jpeg" });
  if (error) return "Não foi possível enviar a foto.";
  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  const { error: e2 } = await admin.from("members").update({ avatar_url: data.publicUrl }).eq("id", me.id);
  if (e2) return "Não foi possível salvar a foto no perfil.";
  revalidatePath("/", "layout");
  return "ok";
}
