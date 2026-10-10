import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question } from "./forms";
import { BASE_ID, emptyDelta, getActiveTemplate, type Template } from "./templates";

// Modelo padrão (igual pra todos) + as perguntas/ajustes do formulário que a pessoa está usando.
export async function loadQuestions(
  sb: SupabaseClient, formKey: string, userId: string, onlyActive = false,
): Promise<{ questions: Question[]; personal: boolean; typeName: string; template: Template }> {
  const [{ data }, template] = await Promise.all([
    sb.from("form_questions").select("*").eq("form_key", formKey).order("position"),
    getActiveTemplate(userId),
  ]);
  const delta = template.forms[formKey] ?? emptyDelta();
  const model = ((data ?? []) as Question[])
    .filter((q) => !q.owner_id)
    .map((q) => (delta.overrides[q.key] ? { ...q, ...delta.overrides[q.key], overridden: true } : q));
  const all = [...model, ...delta.questions];
  return {
    questions: onlyActive ? all.filter((q) => q.active) : all,
    personal: template.id !== BASE_ID,
    typeName: template.name,
    template,
  };
}
