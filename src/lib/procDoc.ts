import { createAdminClient } from "@/lib/supabase/admin";
import type { Rec } from "@/lib/records";
import { ACOMP_PATH, FISC_BASE_PATH, REPORT_BUCKET, REPORT_PATH, acompValues, fillDocx, questionValues, reportValues } from "@/lib/report";
import { buildFiscDoc } from "@/lib/fisc";
import { emptyPara, serializeDocx } from "@/lib/docxDoc";
import { CONFIG_PATH, applyConfig, type ReportConfig } from "@/lib/reportEdit";

// Os documentos de cada processo: o modelo do NUPS preenchido, guardado à parte para ser editado na tela
// (e baixado em .docx). Há o do Cadastro inicial e vários de Acompanhamento/reavaliação.
export const DOC_BUCKET = REPORT_BUCKET; // bucket privado "modelos"
export type DocRef = { kind: "inicial" } | { kind: "acomp"; n: number } | { kind: "fisc" } | { kind: "nota" };
export const INICIAL: DocRef = { kind: "inicial" };

export const docPath = (id: string, ref: DocRef = INICIAL) =>
  ref.kind === "acomp" ? `acompanhamentos/${id}/${ref.n}.docx`
    : ref.kind === "fisc" ? `fiscalizacoes/${id}.docx`
    : ref.kind === "nota" ? `notas/${id}.docx`
    : `processos/${id}.docx`;
export const refKey = (ref: DocRef) => (ref.kind === "acomp" ? `acomp:${ref.n}` : ref.kind === "fisc" ? "fisc" : ref.kind === "nota" ? "nota" : "inicial");

export async function docVersion(id: string, ref: DocRef = INICIAL): Promise<string | null> {
  const path = docPath(id, ref);
  const dir = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data } = await createAdminClient().storage.from(DOC_BUCKET).list(dir, { search: name, limit: 5 });
  const f = data?.find((x) => x.name === name);
  return f ? String(f.updated_at ?? f.created_at ?? "") : null;
}

type Signer = { name: string; registry: string };

export async function generateDoc(rec: Rec, ref: DocRef, signer?: Signer): Promise<Buffer | null> {
  const admin = createAdminClient();
  const basePath = ref.kind === "inicial" ? REPORT_PATH : ref.kind === "fisc" ? FISC_BASE_PATH : ACOMP_PATH;
  let { data } = await admin.storage.from(REPORT_BUCKET).download(basePath);
  if (!data && ref.kind === "fisc") data = (await admin.storage.from(REPORT_BUCKET).download(ACOMP_PATH)).data; // sem base própria: usa a do acompanhamento
  if (!data) return null;
  const tpl = Buffer.from(await data.arrayBuffer());
  if (ref.kind === "nota") return serializeDocx(tpl, [emptyPara()]); // folha em branco com o cabeçalho do NUPS
  if (ref.kind === "fisc") return buildFiscDoc(tpl, rec); // usa o cabeçalho e a página do modelo de acompanhamento
  if (ref.kind === "acomp") {
    return fillDocx(tpl, acompValues(rec.answers, signer ?? { name: "", registry: "" }, rec.meta.acompData?.[String(ref.n)] ?? {}));
  }
  let cfg: ReportConfig | null = null;
  const c = await admin.storage.from(REPORT_BUCKET).download(CONFIG_PATH);
  if (c.data) { try { cfg = JSON.parse(await c.data.text()); } catch { cfg = null; } }
  const values = { ...questionValues(rec.answers), ...reportValues(rec.answers) };
  return fillDocx(tpl, values, (xml) => applyConfig(xml, cfg));
}

// Devolve o documento; se ainda não existe, gera do modelo e guarda.
export async function loadProcessDoc(rec: Rec, ref: DocRef = INICIAL, signer?: Signer): Promise<{ buf: Buffer; version: string } | null> {
  const admin = createAdminClient();
  const got = await admin.storage.from(DOC_BUCKET).download(docPath(rec.id, ref));
  if (got.data) {
    return { buf: Buffer.from(await got.data.arrayBuffer()), version: (await docVersion(rec.id, ref)) ?? "" };
  }
  const buf = await generateDoc(rec, ref, signer);
  if (!buf) return null;
  await storeProcessDoc(rec.id, buf, ref);
  return { buf, version: (await docVersion(rec.id, ref)) ?? "" };
}

export async function storeProcessDoc(id: string, buf: Buffer, ref: DocRef = INICIAL) {
  return createAdminClient().storage.from(DOC_BUCKET).upload(docPath(id, ref), buf, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
}

// Apaga do armazenamento todos os documentos de um processo.
export async function removeProcessDocs(id: string) {
  const st = createAdminClient().storage.from(DOC_BUCKET);
  const { data } = await st.list(`acompanhamentos/${id}`, { limit: 200 });
  await st.remove([docPath(id), docPath(id, { kind: "fisc" }), docPath(id, { kind: "nota" }), ...(data ?? []).map((f) => `acompanhamentos/${id}/${f.name}`)]);
}
