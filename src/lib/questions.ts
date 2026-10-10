import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question } from "./forms";
import { baseTemplate, type Template } from "./templates";

// As perguntas do Cadastro inicial e do Acompanhamento vêm do banco (form_questions), iguais para todos.
export async function loadQuestions(
  sb: SupabaseClient, formKey: string, _userId: string, onlyActive = false,
): Promise<{ questions: Question[]; personal: boolean; typeName: string; template: Template }> {
  const { data } = await sb.from("form_questions").select("*").eq("form_key", formKey).order("position");
  const all = ((data ?? []) as Question[]).filter((q) => !q.owner_id);
  return {
    questions: onlyActive ? all.filter((q) => q.active) : all,
    personal: false,
    typeName: formKey === "acompanhamento" ? "Acompanhamento" : "Cadastro inicial",
    template: baseTemplate(),
  };
}
