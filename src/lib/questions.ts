import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question } from "./forms";

// Cada pessoa começa com o modelo (owner_id nulo). Ao editar, ganha a própria cópia
// ("Cadastro de <nome>") e passa a usar só ela.
export async function loadQuestions(
  sb: SupabaseClient, formKey: string, ownerId: string, onlyActive = false,
): Promise<{ questions: Question[]; personal: boolean }> {
  let { data, error } = await sb
    .from("form_questions").select("*").eq("form_key", formKey)
    .or(`owner_id.is.null,owner_id.eq.${ownerId}`).order("position");
  if (error) {
    // coluna owner_id ainda não existe no banco: usa o modelo único
    ({ data } = await sb.from("form_questions").select("*").eq("form_key", formKey).order("position"));
  }
  const rows = (data ?? []) as Question[];
  const own = rows.filter((r) => r.owner_id === ownerId);
  const list = own.length ? own : rows.filter((r) => !r.owner_id);
  return { questions: onlyActive ? list.filter((q) => q.active) : list, personal: own.length > 0 };
}
