import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessOf, loadRecord } from "@/lib/records";
import { findTemplate, getActiveTemplate, listTemplates, type Template } from "@/lib/templates";
import { fillDocx } from "@/lib/report";

// Gera o relatório (.docx) a partir do modelo guardado no Supabase e das respostas do formulário.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const rec = await loadRecord((await params).id);
  if (!rec || !accessOf(rec, me).canView) return new Response("Não encontrado", { status: 404 });

  // modelo usado no preenchimento; senão o do dono; senão qualquer modelo que tenha relatório
  const tplId = (rec.answers as Record<string, { value?: string }>)._template_id?.value;
  let tpl: Template | null = tplId ? await findTemplate(tplId) : null;
  if (!tpl?.report) tpl = await getActiveTemplate(rec.created_by);
  if (!tpl?.report) tpl = (await listTemplates()).find((t) => t.report) ?? null;
  if (!tpl?.report) return new Response("Nenhum modelo de relatório cadastrado.", { status: 404 });

  const { data } = await createAdminClient().storage.from(tpl.report.bucket).download(tpl.report.path);
  if (!data) return new Response("Modelo de relatório indisponível.", { status: 404 });

  const buf = await fillDocx(Buffer.from(await data.arrayBuffer()), tpl.report.map, rec.answers);
  const nome = (rec.answers.nomes?.value ?? "formulario").replace(/[^\wÀ-ÿ ;-]+/g, "").slice(0, 60);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`Relatório inicial - ${nome}.docx`)}`,
    },
  });
}
