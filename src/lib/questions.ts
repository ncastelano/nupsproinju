import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Question } from "./forms";

// Perguntas que a pessoa acrescentou ao modelo (ficam nos dados da própria conta).
export type QuestionOverride = { label?: string; help?: string; options?: string[]; required?: boolean };
export type CustomForm = {
  name: string;
  questions: Question[];
  overrides?: Record<string, QuestionOverride>;
};
export type CustomForms = Record<string, CustomForm>;

export async function getCustomForms(ownerId: string): Promise<CustomForms> {
  const { data } = await createAdminClient().auth.admin.getUserById(ownerId);
  return ((data.user?.user_metadata as Record<string, unknown> | undefined)?.custom_forms ?? {}) as CustomForms;
}

// Modelo (igual pra todos) + as perguntas extras de quem está preenchendo.
export async function loadQuestions(
  sb: SupabaseClient, formKey: string, ownerId: string, onlyActive = false,
): Promise<{ questions: Question[]; personal: boolean; typeName: string }> {
  const { data } = await sb
    .from("form_questions").select("*").eq("form_key", formKey).order("position");
  const custom = (await getCustomForms(ownerId))[formKey];
  const extras = custom?.questions ?? [];
  const overrides = custom?.overrides ?? {};
  // ajustes que a própria pessoa fez nas perguntas do modelo
  const model = ((data ?? []) as Question[])
    .filter((q) => !q.owner_id)
    .map((q) => (overrides[q.key] ? { ...q, ...overrides[q.key], overridden: true } : q));
  const all = [...model, ...extras];
  return {
    questions: onlyActive ? all.filter((q) => q.active) : all,
    personal: extras.length > 0 || Object.keys(overrides).length > 0,
    typeName: custom?.name ?? "",
  };
}
