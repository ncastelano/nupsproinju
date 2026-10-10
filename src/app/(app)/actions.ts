"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(_: string | null, form: FormData) {
  const me = await requireMember();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm_password") ?? "");
  const typed = String(form.get("professional_name") ?? "").trim();
  const registry = String(form.get("professional_registry") ?? "").trim();
  if (!name) return "Informe o seu nome.";
  if (password || confirm) {
    if (password.length < 6) return "A nova senha precisa ter pelo menos 6 caracteres.";
    if (password !== confirm) return "A confirmação não é igual à nova senha.";
  }

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { name };

  if (typed && !me.professional_id) {
    // escolhe um nome que já existe ou cadastra um novo na lista do NUPS
    const { data: all } = await admin.from("professionals").select("id,name");
    const found = (all ?? []).find((p) => p.name.trim().toLowerCase() === typed.toLowerCase());
    let id = found?.id as string | undefined;
    if (!id) {
      const { data: created, error } = await admin
        .from("professionals").insert({ name: typed, registry }).select("id").single();
      if (error || !created) return "Não foi possível cadastrar esse nome na lista do NUPS.";
      id = created.id;
    }
    patch.professional_id = id;
  }

  const { error } = await admin.from("members").update(patch).eq("id", me.id);
  if (error) return "Esse profissional já está ligado a outra conta.";
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
  await admin.from("members").update({ avatar_url: data.publicUrl }).eq("id", me.id);
  revalidatePath("/", "layout");
  return "ok";
}

export async function createAcolhimento(_: string | null, form: FormData) {
  const me = await requireMember();
  if (!me.professional_id) return "Ligue o seu perfil a um profissional do NUPS antes de preencher.";

  const s = (k: string) => String(form.get(k) ?? "").trim();
  const modality = s("modality") === "Outro" ? `Outro: ${s("modality_other")}` : s("modality");
  const has = s("has_related_processes");
  const row = {
    created_by: me.id,
    professional_id: me.professional_id,
    process_number: s("process_number"),
    children_names: s("children_names"),
    children_birthdates: s("children_birthdates"),
    mother_name: s("mother_name"), mother_address: s("mother_address"), mother_contact: s("mother_contact"),
    father_name: s("father_name"), father_address: s("father_address"), father_contact: s("father_contact"),
    reception_date: s("reception_date"),
    tutelary_council: s("tutelary_council"),
    modality,
    unit_name: s("unit_name"),
    has_related_processes: has,
    related_processes: has === "sim" ? s("related_processes") : "",
    procedures: s("procedures"),
  };
  const required = [row.process_number, row.children_names, row.children_birthdates, row.reception_date, row.modality, row.unit_name, row.procedures];
  if (required.some((v) => !v) || !["sim", "nao", "nao_verificado"].includes(has)) {
    return "Preencha todos os campos obrigatórios (marcados com *).";
  }
  if (s("modality") === "Outro" && !s("modality_other")) return "Informe qual é a outra modalidade.";

  const supabase = await createClient();
  const { error } = await supabase.from("acolhimentos").insert(row);
  if (error) return "Não foi possível salvar. Tente novamente.";
  revalidatePath("/");
  return "ok";
}

export async function deleteAcolhimento(form: FormData) {
  await requireMember();
  const supabase = await createClient();
  await supabase.from("acolhimentos").delete().eq("id", String(form.get("id")));
  revalidatePath("/");
}
