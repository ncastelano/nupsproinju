import { getMember } from "@/lib/auth";
import { loadRecord } from "@/lib/records";
import { NOTA_KEY, noteVis } from "@/lib/notes";
import { loadProcessDoc } from "@/lib/procDoc";
import { docResponse } from "@/lib/docResponse";

// Baixa a nota (.docx ou PDF). Só a própria pessoa.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  const inside = !!me && me.status === "approved";
  const rec = await loadRecord((await params).id, NOTA_KEY);
  if (!rec) return new Response("Não encontrado", { status: 404 });
  const pub = noteVis(rec.answers.visibilidade?.value) === "publico";
  // pública: qualquer pessoa; serviço: só quem tem conta
  if (!pub && !inside) return new Response("Não autorizado", { status: 401 });
  const doc = await loadProcessDoc(rec, { kind: "nota" }, me ?? undefined);
  if (!doc) return new Response("Modelo indisponível.", { status: 404 });
  return docResponse(req, doc.buf, rec.answers.titulo?.value || "Nota");
}
