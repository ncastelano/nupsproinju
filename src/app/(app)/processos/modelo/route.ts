import JSZip from "jszip";
import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PLACEHOLDER_SOURCE, REPORT_BUCKET, REPORT_PATH } from "@/lib/report";
import { CONFIG_PATH, listParagraphs, type ReportConfig } from "@/lib/reportEdit";

// Mostra (ou baixa) o modelo do relatório que o Cadastro inicial preenche.
export async function GET(req: Request) {
  const me = await getMember();
  if (!me || me.status !== "approved") return new Response("Não autorizado", { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin.storage.from(REPORT_BUCKET).download(REPORT_PATH);
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

  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml")!.async("string");
  let cfg: ReportConfig = { paragraphs: {} };
  const c = await admin.storage.from(REPORT_BUCKET).download(CONFIG_PATH);
  if (c.data) { try { cfg = JSON.parse(await c.data.text()); } catch { /* usa o original */ } }

  // parágrafos com texto (os vazios ficam de fora da tela, mas mantêm a numeração)
  const paragraphs = listParagraphs(xml)
    .filter((p) => p.text.trim() !== "" || cfg.paragraphs[String(p.i)] !== undefined)
    .map((p) => ({
      i: p.i,
      original: p.text,
      text: cfg.paragraphs[String(p.i)] ?? p.text,
      edited: cfg.paragraphs[String(p.i)] !== undefined,
    }));

  const supabase = await createClient();
  const { data: qs } = await supabase
    .from("form_questions").select("key,label,position").eq("form_key", "cadastro_inicial").eq("active", true).order("position");

  return Response.json({
    paragraphs,
    questions: (qs ?? []).map((q) => ({ key: q.key, label: q.label })),
    sources: PLACEHOLDER_SOURCE,
    canEdit: me.role === "admin",
  });
}
