"use server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLACEHOLDER_SOURCE, REPORT_BUCKET, REPORT_PATH, markersOf } from "@/lib/report";

// Troca o modelo do relatório por uma versão editada no Word (só o administrador).
export async function replaceReportTemplate(_: string | null, form: FormData) {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return "Escolha o arquivo .docx editado.";
  if (!file.name.toLowerCase().endsWith(".docx")) return "O modelo precisa ser um arquivo .docx (Word).";
  if (file.size > 8 * 1024 * 1024) return "Arquivo muito grande (limite de 8 MB).";

  const buf = Buffer.from(await file.arrayBuffer());
  let found: string[];
  try { found = await markersOf(buf); } catch { return "Não consegui ler esse arquivo. Salve-o como .docx pelo Word e tente de novo."; }
  if (found.length === 0) return "O documento não tem nenhum campo {{ASSIM}}. Edite o modelo baixado, mantendo os campos entre chaves duplas.";

  const known = new Set(Object.keys(PLACEHOLDER_SOURCE));
  const unknown = found.filter((m) => !known.has(m));
  const missing = [...known].filter((m) => !found.includes(m));

  // guarda a versão anterior antes de trocar
  const admin = createAdminClient();
  const { data: old } = await admin.storage.from(REPORT_BUCKET).download(REPORT_PATH);
  if (old) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await admin.storage.from(REPORT_BUCKET).upload(`anteriores/${stamp}.docx`, Buffer.from(await old.arrayBuffer()), {
      contentType: "application/octet-stream",
    });
  }
  const { error } = await admin.storage.from(REPORT_BUCKET).upload(REPORT_PATH, buf, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
  if (error) return "Não foi possível salvar o modelo. Tente de novo.";

  const avisos: string[] = [];
  if (unknown.length) avisos.push(`Campos que o sistema não conhece (vão aparecer escritos no relatório): ${unknown.map((m) => `{{${m}}}`).join(", ")}.`);
  if (missing.length) avisos.push(`Campos que ficaram de fora do documento: ${missing.length}.`);
  return `ok:Modelo atualizado (${found.length} campos preenchidos automaticamente).${avisos.length ? " " + avisos.join(" ") : ""}`;
}
