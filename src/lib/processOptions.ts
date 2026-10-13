import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";

// Números de processo com Cadastro inicial concluído (para vincular a fiscalização a eles).
export async function loadProcessNumbers(): Promise<string[]> {
  const { data } = await createAdminClient().from("intake_records")
    .select("meta:answers->_meta, numero:answers->processo->>value").eq("form_key", FORM_KEY);
  const nums = (data ?? [])
    .filter((r) => !(r.meta as { draft?: boolean } | null)?.draft)
    .map((r) => String(r.numero ?? "").trim()).filter(Boolean);
  return [...new Set(nums)].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
}
