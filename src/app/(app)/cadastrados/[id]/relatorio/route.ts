import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessOf, loadRecord } from "@/lib/records";
import { REPORT_BUCKET, REPORT_PATH, fillDocx, questionValues, reportValues } from "@/lib/report";
import { CONFIG_PATH, applyConfig, type ReportConfig } from "@/lib/reportEdit";

// Gera o Relatório inicial de acompanhamento (.docx) com as respostas do Cadastro inicial.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const rec = await loadRecord((await params).id);
  if (!rec || !accessOf(rec, me).canView) return new Response("Não encontrado", { status: 404 });

  const { data } = await createAdminClient().storage.from(REPORT_BUCKET).download(REPORT_PATH);
  if (!data) return new Response("Modelo de relatório indisponível.", { status: 404 });

  // textos editados no sistema (se houver)
  let cfg: ReportConfig | null = null;
  const c = await createAdminClient().storage.from(REPORT_BUCKET).download(CONFIG_PATH);
  if (c.data) { try { cfg = JSON.parse(await c.data.text()); } catch { cfg = null; } }

  const values = { ...questionValues(rec.answers), ...reportValues(rec.answers) };
  const buf = await fillDocx(Buffer.from(await data.arrayBuffer()), values, (xml) => applyConfig(xml, cfg));
  const nome = (rec.answers.nomes?.value ?? "processo").replace(/[^\wÀ-ÿ ;-]+/g, "").slice(0, 60);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`Relatório inicial - ${nome}.docx`)}`,
    },
  });
}
