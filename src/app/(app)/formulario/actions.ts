"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEY, OTHER_PREFIX, type Question } from "@/lib/forms";

export async function saveIntake(_: string | null, form: FormData) {
  const me = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("form_questions").select("*")
    .eq("form_key", FORM_KEY).eq("active", true).order("position");
  const questions = (data ?? []) as Question[];

  const answers: Record<string, { label: string; value: string }> = {};
  for (const q of questions) {
    let value = String(form.get(q.key) ?? "").trim();
    if (q.type === "radio_other" && value === "__outro__") {
      const other = String(form.get(`${q.key}__outro`) ?? "").trim();
      value = other ? OTHER_PREFIX + other : "";
    }
    if (q.required && !value) return `Preencha: ${q.label}`;
    if (value) answers[q.key] = { label: q.label, value };
  }

  const { error } = await supabase
    .from("intake_records")
    .insert({ form_key: FORM_KEY, created_by: me.id, answers });
  if (error) return "Não foi possível salvar. Tente novamente.";
  revalidatePath("/banco-de-dados");
  return "ok";
}
