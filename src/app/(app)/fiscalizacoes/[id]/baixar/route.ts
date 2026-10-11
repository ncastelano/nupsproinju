import { getMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { FISC_KEY } from "@/lib/fisc";
import { loadProcessDoc } from "@/lib/procDoc";
import { docResponse } from "@/lib/docResponse";

// Baixa o relatório da fiscalização (.docx) já com as edições feitas na tela.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const rec = await loadRecord((await params).id, FISC_KEY);
  if (!rec || !accessOf(rec, me).canView || rec.meta.visit?.status !== "realizada") return new Response("Não encontrado", { status: 404 });
  const doc = await loadProcessDoc(rec, { kind: "fisc" }, me);
  if (!doc) return new Response("Modelo indisponível.", { status: 404 });
  const unit = (rec.meta.visit?.unit ?? "unidade").replace(/[^\wÀ-ÿ -]+/g, "").slice(0, 50);
  const date = (rec.meta.visit?.date ?? "").split("-").reverse().join("-");
  return docResponse(req, doc.buf, `Fiscalização - ${unit} - ${date}`);
}
