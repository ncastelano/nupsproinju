"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  await admin.from("members").update({ name, registry }).eq("id", me.id);
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
  if (!me.registry) return "Informe o seu CRP ou CRESS no perfil antes de preencher.";

  const s = (k: string) => String(form.get(k) ?? "").trim();
  const modality = s("modality") === "Outro" ? `Outro: ${s("modality_other")}` : s("modality");
  const has = s("has_related_processes");
  const row = {
    created_by: me.id,
    professional_name: me.name,
    professional_registry: me.registry,
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

  // perguntas extras criadas pelo administrador
  const { data: qs } = await supabase.from("form_questions").select("*").order("position");
  const extra: { label: string; value: string }[] = [];
  for (const q of qs ?? []) {
    let v = s(`q_${q.id}`);
    if (v === "__other") v = s(`q_${q.id}_other`);
    if (q.required && !v) return `Responda: ${q.label}`;
    if (v) extra.push({ label: q.label, value: v });
  }

  const { error } = await supabase.from("acolhimentos").insert({ ...row, extra_answers: extra });
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

const KINDS = ["text", "textarea", "date", "choice", "choice_other"];

export async function createQuestion(_: string | null, form: FormData) {
  await requireAdmin();
  const label = String(form.get("label") ?? "").trim();
  const help = String(form.get("help") ?? "").trim();
  const kind = String(form.get("kind") ?? "");
  const required = form.get("required") === "on";
  const options = String(form.get("options") ?? "")
    .split("\n").map((o) => o.trim()).filter(Boolean);
  if (!label) return "Escreva a pergunta.";
  if (!KINDS.includes(kind)) return "Escolha o tipo de resposta.";
  if ((kind === "choice" || kind === "choice_other") && options.length < 2) {
    return "Informe pelo menos 2 respostas prontas (uma por linha).";
  }

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("form_questions").select("position").order("position", { ascending: false }).limit(1);
  const position = (last?.[0]?.position ?? 0) + 1;
  const { error } = await admin.from("form_questions").insert({
    label, help, kind, required, position,
    options: kind === "choice" || kind === "choice_other" ? options : [],
  });
  if (error) return "Não foi possível salvar a pergunta.";
  revalidatePath("/");
  return "ok";
}

export async function deleteQuestion(form: FormData) {
  await requireAdmin();
  await createAdminClient().from("form_questions").delete().eq("id", String(form.get("id")));
  revalidatePath("/");
}
