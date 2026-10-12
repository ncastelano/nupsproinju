import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Quantos pedidos de acesso estão aguardando (só administradores). Usado pelo aviso das abas.
export async function GET() {
  const me = await getMember();
  if (!me || me.status !== "approved" || me.role !== "admin") return Response.json({ n: 0 }, { status: 403 });
  const { count } = await createAdminClient().from("members").select("id", { count: "exact", head: true }).eq("status", "pending");
  return Response.json({ n: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
