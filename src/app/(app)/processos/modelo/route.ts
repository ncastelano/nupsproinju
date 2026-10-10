import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLACEHOLDER_SOURCE, REPORT_BUCKET, REPORT_PATH } from "@/lib/report";

// Mostra (ou baixa) o modelo do relatório que o Cadastro inicial preenche.
export async function GET(req: Request) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });

  const { data } = await createAdminClient().storage.from(REPORT_BUCKET).download(REPORT_PATH);
  if (!data) return new Response("Modelo indisponível.", { status: 404 });
  const buf = Buffer.from(await data.arrayBuffer());

  if (new URL(req.url).searchParams.get("baixar")) {
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("MODELO - Relatório inicial de acompanhamento.docx")}`,
      },
    });
  }

  const mammoth = await import("mammoth");
  const text = (await mammoth.extractRawText({ buffer: buf })).value;
  const lines = text.split("\n").map((l) => l.replace(/\s+$/g, "")).filter((l, i, a) => l.trim() || (i > 0 && a[i - 1].trim()));
  return Response.json({ lines, sources: PLACEHOLDER_SOURCE });
}
