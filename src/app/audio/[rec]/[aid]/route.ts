import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecord } from "@/lib/records";
import { DOC_BUCKET } from "@/lib/procDoc";

// Toca um áudio gravado em um relatório (só quem tem conta; notas, só a própria pessoa).
export async function GET(_: Request, { params }: { params: Promise<{ rec: string; aid: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const { rec: id, aid } = await params;
  const rec = await loadRecord(id, null);
  if (!rec || (rec.form_key === "nota" && rec.created_by !== me.id)) return new Response("Não encontrado", { status: 404 });
  const a = rec.meta.audios?.find((x) => x.id === aid);
  if (!a) return new Response("Não encontrado", { status: 404 });
  const { data } = await createAdminClient().storage.from(DOC_BUCKET).download(a.path);
  if (!data) return new Response("Não encontrado", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { "Content-Type": a.mime || "audio/webm", "Cache-Control": "private, max-age=3600" } });
}
