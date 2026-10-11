import { ACOMP_PATH, FISC_BASE_PATH, PLACEHOLDER_SOURCE, REPORT_BUCKET, REPORT_PATH } from "@/lib/report";
import { createAdminClient } from "@/lib/supabase/admin";

// Arquivos-base (.docx) usados para gerar cada tipo de relatório.
export type ModelKind = "inicial" | "acomp" | "fisc";
export const MODELS: Record<ModelKind, { path: string; title: string; file: string; note: string }> = {
  inicial: {
    path: REPORT_PATH, title: "Modelo do Cadastro inicial", file: "Relatório inicial de acompanhamento (modelo).docx",
    note: "Os campos {{ASSIM}} do arquivo são preenchidos com as respostas do Cadastro inicial.",
  },
  acomp: {
    path: ACOMP_PATH, title: "Modelo do Acompanhamento", file: "Relatório de acompanhamento e reavaliação (modelo).docx",
    note: "Os campos {{ASSIM}} do arquivo são preenchidos com o cadastro e o formulário do acompanhamento.",
  },
  fisc: {
    path: FISC_BASE_PATH, title: "Modelo da Fiscalização", file: "Relatório de fiscalização (base).docx",
    note: "Define o cabeçalho, a página e os estilos; o texto é montado com as respostas do questionário.",
  },
};

export const ACOMP_MARKERS = [
  "PROCESSO", "CRIANCAS", "NASCIMENTOS", "IDADE", "GENITORA", "GENITOR", "DATA_ACOLHIMENTO", "MODALIDADE", "UNIDADE", "PROFISSIONAL",
  "PROCEDIMENTOS", "COMPARATIVO_ACOLHIMENTO", "COMPARATIVO_EDUCACAO", "COMPARATIVO_SAUDE", "COMPARATIVO_EMOCIONAL",
  "COMPARATIVO_CONVIVENCIA_FAMILIAR", "COMPARATIVO_CONVIVENCIA_COMUNITARIA", "SITUACAO_GENITORA", "SITUACAO_GENITOR",
  "SITUACAO_FAMILIA_EXTENSA", "INFORMACOES_FAMILIARES", "ACOMPANHAMENTO_PENDENCIAS", "PENDENCIAS_PROXIMO_PERIODO",
  "ANALISE_PSICOSSOCIAL", "LOCAL_DATA", "ASSINATURA",
];
export const knownMarkers = (k: ModelKind) => (k === "inicial" ? Object.keys(PLACEHOLDER_SOURCE) : k === "acomp" ? ACOMP_MARKERS : []);

export type ModelInfo = { name: string; size: number; updatedAt: string | null; by?: string; original?: string };
const INFO_PATH = "modelos-info.json";

type InfoFile = Partial<Record<ModelKind, { original: string; at: string; by: string }>>;
export async function readInfoFile(): Promise<InfoFile> {
  const { data } = await createAdminClient().storage.from(REPORT_BUCKET).download(INFO_PATH);
  if (!data) return {};
  try { return JSON.parse(await data.text()) as InfoFile; } catch { return {}; }
}
export async function writeInfoFile(info: InfoFile) {
  await createAdminClient().storage.from(REPORT_BUCKET).upload(INFO_PATH, Buffer.from(JSON.stringify(info)), { contentType: "application/json", upsert: true });
}

// O modelo em uso: nome do arquivo, tamanho e quando foi trocado pela última vez.
export async function modelInfo(kind: ModelKind): Promise<ModelInfo | null> {
  const m = MODELS[kind];
  const st = createAdminClient().storage.from(REPORT_BUCKET);
  const { data: files } = await st.list("", { search: m.path, limit: 5 });
  const f = files?.find((x) => x.name === m.path);
  if (!f) return null;
  const info = (await readInfoFile())[kind];
  return {
    name: info?.original || m.file,
    size: Number((f.metadata as { size?: number } | null)?.size ?? 0),
    updatedAt: info?.at ?? (f.updated_at ?? f.created_at ?? null),
    by: info?.by, original: info?.original,
  };
}
