import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAuthUsers } from "@/lib/profiles";
import { metaStore } from "@/lib/reqcache";
import type { Question } from "@/lib/forms";

// Modelo de formulário = as perguntas do modelo padrão + o que a pessoa acrescentou/ajustou.
// Fica nos dados da conta de quem criou (sem tabela nova) e todos conseguem ver e usar.
export const BASE_ID = "base";

export type QuestionOverride = { label?: string; help?: string; options?: string[]; required?: boolean };
export type FormDelta = {
  questions: Question[];
  overrides: Record<string, QuestionOverride>;
  replaceBase?: boolean; // usa só estas perguntas (um modelo completo, não um ajuste do padrão)
};
export type Template = {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  parent_name: string | null;
  created_at: string;
  forms: Record<string, FormDelta>;
  // modelo de relatório (.docx) guardado no Supabase Storage; map: {{MARCADOR}} -> chave da pergunta
  report?: { bucket: string; path: string; map: Record<string, string> };
};

export const emptyDelta = (): FormDelta => ({ questions: [], overrides: {} });
export const newTemplateId = () => "tpl_" + randomBytes(5).toString("hex");

export function baseTemplate(): Template {
  return {
    id: BASE_ID, name: "Modelo padrão", owner_id: "", owner_name: "Núcleo Psicossocial",
    parent_name: null, created_at: "", forms: {},
  };
}

type Meta = Record<string, unknown>;
async function metaOf(userId: string): Promise<Meta> {
  const store = metaStore();
  const hit = store.get(userId);
  if (hit) return hit;
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  const m = (data.user?.user_metadata ?? {}) as Meta;
  store.set(userId, m);
  return m;
}
async function writeMeta(userId: string, patch: (m: Meta) => Meta) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const cur = (data.user?.user_metadata ?? {}) as Meta;
  return admin.auth.admin.updateUserById(userId, { user_metadata: patch(cur) });
}

export async function listTemplates(): Promise<Template[]> {
  const users = await listAuthUsers();
  const all: Template[] = [];
  for (const u of users) {
    const t = (u.user_metadata?.templates ?? {}) as Record<string, Template>;
    all.push(...Object.values(t));
  }
  all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return [baseTemplate(), ...all];
}

export async function findTemplate(id: string): Promise<Template | null> {
  if (id === BASE_ID) return baseTemplate();
  return (await listTemplates()).find((t) => t.id === id) ?? null;
}

export async function getActiveTemplate(userId: string): Promise<Template> {
  const m = await metaOf(userId);
  const id = String(m.active_template ?? BASE_ID);
  if (id === BASE_ID) return baseTemplate();
  const own = (m.templates as Record<string, Template> | undefined)?.[id];
  return own ?? (await findTemplate(id)) ?? baseTemplate();
}

export async function setActiveTemplate(userId: string, id: string) {
  return writeMeta(userId, (m) => ({ ...m, active_template: id }));
}

export async function saveTemplate(t: Template) {
  return writeMeta(t.owner_id, (m) => ({
    ...m, templates: { ...((m.templates as Record<string, Template>) ?? {}), [t.id]: t },
  }));
}

export async function removeTemplate(ownerId: string, id: string) {
  return writeMeta(ownerId, (m) => {
    const { [id]: _drop, ...rest } = (m.templates as Record<string, Template>) ?? {};
    return { ...m, templates: rest };
  });
}
