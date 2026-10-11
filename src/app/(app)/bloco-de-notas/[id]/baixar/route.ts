import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecord } from "@/lib/records";
import { NOTA_KEY } from "@/lib/notes";
import { loadProcessDoc } from "@/lib/procDoc";
import { docResponse } from "@/lib/docResponse";

// Baixa a nota (.docx ou PDF). Só a própria pessoa.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const rec = await loadRecord((await params).id, NOTA_KEY);
  if (!rec || rec.created_by !== me.id) return new Response("Não encontrado", { status: 404 });
  const doc = await loadProcessDoc(rec, { kind: "nota" }, me);
  if (!doc) return new Response("Modelo indisponível.", { status: 404 });
  void createAdminClient;
  return docResponse(req, doc.buf, rec.answers.titulo?.value || "Nota");
}
