"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, OTHER_PREFIX, PROFESSIONAL_KEYS } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";

// Cadastro inicial cria a ficha; Acompanhamento preenche/atualiza a MESMA ficha (coluna followup).
export async function saveIntake(_: string | null, form: FormData) {
  const me = await requireMember();
  const formKey = form.get("form_key") === FORM_ACOMP ? FORM_ACOMP : FORM_KEY;
  const supabase = await createClient();

  let recordId: string | null = null;
  if (formKey === FORM_ACOMP) {
    recordId = String(form.get("record_id") ?? "") || null;
    if (!recordId) return "Escolha o acolhido do acompanhamento.";
  }

  const { questions } = await loadQuestions(supabase, formKey, me.id, true);
  const signature = [me.name || me.email, me.registry].filter(Boolean).join(" - ");

  const answers: Record<string, { label: string; value: string }> = {};
  for (const q of questions) {
    let value: string;
    if (PROFESSIONAL_KEYS.includes(q.key)) {
      // o responsável é sempre quem está logado, não o que veio do navegador
      if (!me.registry) return "Informe o seu CRP ou CRESS no perfil antes de salvar.";
      value = signature;
    } else if (q.type === "checkbox") {
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

  if (formKey === FORM_ACOMP) {
    const { data: upd, error } = await supabase
      .from("intake_records")
      .update({ followup: answers, followup_at: new Date().toISOString() })
      .eq("id", recordId!).eq("form_key", FORM_KEY).select("id");
    if (error || !upd?.length) return "Não foi possível salvar o acompanhamento.";
  } else {
    const { error } = await supabase
      .from("intake_records").insert({ form_key: FORM_KEY, created_by: me.id, answers });
    if (error) return "Não foi possível salvar. Tente novamente.";
  }
  revalidatePath("/banco-de-dados");
  revalidatePath("/banco-de-dados", "layout");
  return "ok";
}
