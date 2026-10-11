import { createAdminClient } from "@/lib/supabase/admin";
import type { Rec } from "@/lib/records";
import { REPORT_BUCKET, REPORT_PATH, fillDocx, questionValues, reportValues } from "@/lib/report";
import { CONFIG_PATH, applyConfig, type ReportConfig } from "@/lib/reportEdit";

// O documento de cada processo: o modelo do NUPS preenchido com o Cadastro inicial,
// guardado à parte para ser editado na tela (e baixado em .docx).
export const DOC_BUCKET = REPORT_BUCKET; // bucket privado "modelos", pasta processos/
export const docPath = (id: string) => `processos/${id}.docx`;

export async function docVersion(id: string): Promise<string | null> {
  const { data } = await createAdminClient().storage.from(DOC_BUCKET).list("processos", { search: `${id}.docx`, limit: 5 });
  const f = data?.find((x) => x.name === `${id}.docx`);
  return f ? String(f.updated_at ?? f.created_at ?? "") : null;
}

async function generate(rec: Rec): Promise<Buffer | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(REPORT_BUCKET).download(REPORT_PATH);
  if (!data) return null;
  let cfg: ReportConfig | null = null;
  const c = await admin.storage.from(REPORT_BUCKET).download(CONFIG_PATH);
  if (c.data) { try { cfg = JSON.parse(await c.data.text()); } catch { cfg = null; } }
  const values = { ...questionValues(rec.answers), ...reportValues(rec.answers) };
  return fillDocx(Buffer.from(await data.arrayBuffer()), values, (xml) => applyConfig(xml, cfg));
}

// Devolve o documento do processo; se ainda não existe, gera do modelo e guarda.
export async function loadProcessDoc(rec: Rec): Promise<{ buf: Buffer; version: string } | null> {
  const admin = createAdminClient();
  const got = await admin.storage.from(DOC_BUCKET).download(docPath(rec.id));
  if (got.data) {
    return { buf: Buffer.from(await got.data.arrayBuffer()), version: (await docVersion(rec.id)) ?? "" };
  }
  const buf = await generate(rec);
  if (!buf) return null;
  await storeProcessDoc(rec.id, buf);
  return { buf, version: (await docVersion(rec.id)) ?? "" };
}

export async function storeProcessDoc(id: string, buf: Buffer) {
  return createAdminClient().storage.from(DOC_BUCKET).upload(docPath(id), buf, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
}
