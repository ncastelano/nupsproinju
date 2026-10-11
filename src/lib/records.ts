import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";

export type Ans = Record<string, { label: string; value: string }>;
export type Scope = "formulario" | "acompanhamento";
export type HistoryEntry = {
  at: string; by_id: string; by_name: string; scope: Scope;
  changes: { label: string; from: string; to: string }[];
  note?: string;
  doc?: string; // "inicial" ou "acomp:N": a que documento a atividade se refere
};
export type FollowupEntry = { at: string; by_name: string; answers: Ans };
export type AcompEntry = { n: number; at: string; by_id: string; by_name: string; draft?: boolean };
export type VisitMeta = {
  unit: string; date: string; professionals: string[];
  status: "agendada" | "realizada";
  responded_at?: string; responded_by?: string;
  draft?: boolean; // questionário respondido pela metade (rascunho)
};
export type RecMeta = {
  shared: { id: string; name: string }[];
  followups: FollowupEntry[]; // todos os acompanhamentos (o mais recente também fica em "followup")
  history: HistoryEntry[];
  editing: Record<string, { name: string; scope: Scope; since: string }>;
  acomps: AcompEntry[]; // relatórios de acompanhamento e reavaliação (documentos .docx)
  visit?: VisitMeta;    // só nas fiscalizações
  acompData?: Record<string, Record<string, string>>; // respostas do questionário de cada acompanhamento (por nº)
  draft?: boolean;      // cadastro inicial salvo como rascunho
};
export type Rec = {
  id: string; created_by: string; created_at: string; form_key: string;
  answers: Ans; followup: Ans | null; meta: RecMeta;
};

const STALE_MS = 30 * 60 * 1000; // uma edição esquecida expira em 30 min

// Compartilhamento, histórico e quem está editando ficam junto da ficha (answers._meta).
export function metaOf(raw: Record<string, unknown>): RecMeta {
  const m = (raw._meta ?? {}) as Partial<RecMeta>;
  const now = Date.now();
  const editing = Object.fromEntries(
    Object.entries(m.editing ?? {}).filter(([, v]) => now - new Date(v.since).getTime() < STALE_MS),
  );
  return { shared: m.shared ?? [], followups: m.followups ?? [], history: m.history ?? [], editing, acomps: m.acomps ?? [], visit: m.visit, acompData: m.acompData, draft: m.draft };
}

// formKey: o tipo de registro (padrão: cadastro inicial); null aceita qualquer tipo.
export async function loadRecord(id: string, formKey: string | null = FORM_KEY): Promise<Rec | null> {
  let qy = createAdminClient()
    .from("intake_records")
    .select("id, created_by, created_at, form_key, answers, followup")
    .eq("id", id);
  if (formKey) qy = qy.eq("form_key", formKey);
  const { data } = await qy.maybeSingle();
  if (!data) return null;
  const raw = (data.answers ?? {}) as Record<string, unknown>;
  const { _meta: _m, ...answers } = raw;
  return {
    id: data.id as string, created_by: data.created_by as string, created_at: data.created_at as string, form_key: data.form_key as string,
    answers: answers as Ans, followup: (data.followup as Ans | null) ?? null, meta: metaOf(raw),
  };
}

// Todas as pessoas com conta aprovada veem e editam os processos; apagar fica com quem criou e os administradores.
export function accessOf(rec: Rec, me: { id: string; role: string }) {
  const owner = rec.created_by === me.id;
  const admin = me.role === "admin";
  return { owner, admin, editor: true, canView: true, canEdit: true, canShare: false };
}

export async function saveRecord(
  rec: Rec,
  patch: { answers?: Ans; followup?: Ans | null; followupAt?: string },
  meta: RecMeta,
) {
  const upd: Record<string, unknown> = {
    answers: { ...(patch.answers ?? rec.answers), _meta: meta },
  };
  if (patch.followup !== undefined) upd.followup = patch.followup;
  if (patch.followupAt) upd.followup_at = patch.followupAt;
  return createAdminClient().from("intake_records").update(upd).eq("id", rec.id);
}
