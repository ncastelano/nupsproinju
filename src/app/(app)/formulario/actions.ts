"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, OTHER_PREFIX, type Question } from "@/lib/forms";

export async function saveIntake(_: string | null, form: FormData) {
  const me = await requireMember();
  const formKey = form.get("form_key") === FORM_ACOMP ? FORM_ACOMP : FORM_KEY;
  const supabase = await createClient();

  // Acompanhamento é sempre ligado a um cadastro inicial (visível pra quem está salvando, via RLS)
  let parentId: string | null = null;
  let parentProcess = "";
  if (formKey === FORM_ACOMP) {
    parentId = String(form.get("parent_id") ?? "") || null;
    if (!parentId) return "Escolha o acolhido do acompanhamento.";
    const { data: parent } = await supabase
      .from("intake_records").select("id, answers").eq("id", parentId).eq("form_key", FORM_KEY).maybeSingle();
    if (!parent) return "Acolhido não encontrado.";
    parentProcess = (parent.answers as Record<string, { value: string }>)?.processo?.value ?? "";
  }

  const { data } = await supabase
    .from("form_questions").select("*")
    .eq("form_key", formKey).eq("active", true).order("position");
  const questions = (data ?? []) as Question[];

  const answers: Record<string, { label: string; value: string }> = {};
  if (parentProcess) answers.processo = { label: "Número do processo", value: parentProcess };
  for (const q of questions) {
    let value: string;
    if (q.type === "checkbox") {
      value = form.getAll(q.key).map((v) => String(v).trim()).filter(Boolean).join("; ");
    } else {
      value = String(form.get(q.key) ?? "").trim();
    }
    if (q.type === "radio_other" && value === "__outro__") {
      const other = String(form.get(`${q.key}__outro`) ?? "").trim();
      value = other ? OTHER_PREFIX + other : "";
    }
    if (q.required && !value) return `Preencha: ${q.label}`;
    if (value) answers[q.key] = { label: q.label, value };
  }

  const { error } = await supabase
    .from("intake_records")
    .insert({ form_key: formKey, created_by: me.id, answers, parent_id: parentId });
  if (error) return "Não foi possível salvar. Tente novamente.";
  revalidatePath("/banco-de-dados");
  return "ok";
}
