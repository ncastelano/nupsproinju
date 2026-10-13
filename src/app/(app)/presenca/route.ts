import { getMember } from "@/lib/auth";
import { pingEditing } from "@/lib/presence";

// Presença no documento (quem está editando e digitando). É uma rota comum, e não ação do servidor,
// para a conferência periódica não renovar a página.
export async function POST(req: Request) {
  const me = await getMember();
  if (!me || me.status !== "approved") return Response.json({ error: "Não autorizado" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; ref?: unknown; editing?: boolean; typing?: boolean };
  if (!b.id || typeof b.id !== "string") return Response.json({ error: "Pedido inválido" }, { status: 400 });
  const r = await pingEditing(me, b.id, b.ref, !!b.editing, !!b.typing);
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}
