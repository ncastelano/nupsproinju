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
export type AcompEntry = { n: number; at: string; by_id: string; by_name: string };
export type RecMeta = {
  shared: { id: string; name: string }[];
  followups: FollowupEntry[]; // todos os acompanhamentos (o mais recente também fica em "followup")
  history: HistoryEntry[];
  editing: Record<string, { name: string; scope: Scope; since: string }>;
  acomps: AcompEntry[]; // relatórios de acompanhamento e reavaliação (documentos .docx)
};
export type Rec = {
  id: string; created_by: string; created_at: string;
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
  return { shared: m.shared ?? [], followups: m.followups ?? [], history: m.history ?? [], editing, acomps: m.acomps ?? [] };
}

export async function loadRecord(id: string): Promise<Rec | null> {
  const { data } = await createAdminClient()
    .from("intake_records")
    .select("id, created_by, created_at, answers, followup")
    .eq("id", id).eq("form_key", FORM_KEY).maybeSingle();
  if (!data) return null;
  const raw = (data.answers ?? {}) as Record<string, unknown>;
  const { _meta: _m, ...answers } = raw;
  return {
    id: data.id as string, created_by: data.created_by as string, created_at: data.created_at as string,
    answers: answers as Ans, followup: (data.followup as Ans | null) ?? null, meta: metaOf(raw),
  };
}

export function accessOf(rec: Rec, me: { id: string; role: string }) {
  const owner = rec.created_by === me.id;
  const admin = me.role === "admin";
  const editor = rec.meta.shared.some((s) => s.id === me.id);
  return { owner, admin, editor, canView: owner || admin || editor, canEdit: owner || admin || editor, canShare: owner || admin };
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
