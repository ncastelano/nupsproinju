import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { REPORT_BUCKET } from "@/lib/report";
import { MODELS, modelInfo, type ModelKind } from "@/lib/models";

// Baixa o arquivo-base (.docx) em uso de um tipo de relatório.
export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });
  const kind = (await params).kind as ModelKind;
  if (!(kind in MODELS)) return new Response("Não encontrado", { status: 404 });
  const { data } = await createAdminClient().storage.from(REPORT_BUCKET).download(MODELS[kind].path);
  if (!data) return new Response("Modelo indisponível", { status: 404 });
  const info = await modelInfo(kind);
  const name = info?.name || MODELS[kind].file;
  return new Response(Buffer.from(await data.arrayBuffer()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name.endsWith(".docx") ? name : `${name}.docx`)}`,
    },
  });
}
