import { getMember } from "@/lib/auth";
import { accessOf, loadRecord } from "@/lib/records";
import { loadProcessDoc } from "@/lib/procDoc";

// Baixa o relatório de acompanhamento e reavaliação (.docx) já com as edições feitas na tela.
export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const { id, n: nRaw } = await params;
  const n = Number(nRaw);
  const rec = await loadRecord(id);
  if (!rec || !Number.isInteger(n) || !accessOf(rec, me).canView || !rec.meta.acomps.some((a) => a.n === n)) {
    return new Response("Não encontrado", { status: 404 });
  }
  const doc = await loadProcessDoc(rec, { kind: "acomp", n }, me);
  if (!doc) return new Response("Modelo indisponível.", { status: 404 });
  const nome = (rec.answers.nomes?.value ?? "processo").replace(/[^\wÀ-ÿ ;-]+/g, "").slice(0, 60);
  return new Response(new Uint8Array(doc.buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`Acompanhamento ${n} - ${nome}.docx`)}`,
    },
  });
}
