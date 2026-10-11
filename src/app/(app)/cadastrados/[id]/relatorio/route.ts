import { getMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { loadProcessDoc } from "@/lib/procDoc";

// Baixa o documento do processo (.docx): o modelo preenchido com o Cadastro inicial, já com as edições feitas na tela.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const rec = await loadRecord((await params).id);
  if (!rec || !accessOf(rec, me).canView) return new Response("Não encontrado", { status: 404 });

  const doc = await loadProcessDoc(rec);
  if (!doc) return new Response("Modelo de relatório indisponível.", { status: 404 });
  const buf = doc.buf;
  const nome = (rec.answers.nomes?.value ?? "processo").replace(/[^\wÀ-ÿ ;-]+/g, "").slice(0, 60);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`Relatório inicial - ${nome}.docx`)}`,
    },
  });
}
