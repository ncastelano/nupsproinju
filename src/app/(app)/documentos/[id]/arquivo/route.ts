import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, findDoc } from "@/lib/documents";

// Baixa o arquivo original; só o dono do processo e o administrador.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const found = await findDoc((await params).id);
  if (!found || (found.ownerId !== me.id && me.role !== "admin")) return new Response("Não encontrado", { status: 404 });

  const { data } = await createAdminClient().storage.from(BUCKET).download(found.doc.path_original);
  if (!data) return new Response("Arquivo indisponível", { status: 404 });
  const name = encodeURIComponent(found.doc.filename);
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${name}`,
    },
  });
}
