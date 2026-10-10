import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAuthUsers } from "@/lib/profiles";
import { metaStore } from "@/lib/reqcache";

// Processos exportados: arquivo original + texto completo no Storage do Supabase (bucket privado);
// a lista (título, origem, data) fica nos dados da conta de quem importou.
export const BUCKET = "processos";

export type DocMeta = {
  id: string; title: string; kind?: "formulario" | "acompanhamento";
  source: "google" | "arquivo"; source_url?: string;
  filename: string; ext: string; size: number; chars: number; created_at: string;
  path_original: string; path_text: string;
};

export const newDocId = () => "doc_" + randomBytes(6).toString("hex");

export async function ensureBucket() {
  const admin = createAdminClient();
  const { data } = await admin.storage.getBucket(BUCKET);
  if (!data) await admin.storage.createBucket(BUCKET, { public: false });
}

export async function listDocs(userId: string): Promise<DocMeta[]> {
  let meta = metaStore().get(userId);
  if (!meta) {
    const { data } = await createAdminClient().auth.admin.getUserById(userId);
    meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    metaStore().set(userId, meta);
  }
  const docs = (meta.documents ?? []) as DocMeta[];
  return [...docs].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addDoc(userId: string, doc: DocMeta) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const docs = ((meta.documents ?? []) as DocMeta[]).filter((d) => d.id !== doc.id);
  return admin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, documents: [doc, ...docs] } });
}

export async function removeDocMeta(userId: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  const docs = ((meta.documents ?? []) as DocMeta[]).filter((d) => d.id !== id);
  return admin.auth.admin.updateUserById(userId, { user_metadata: { ...meta, documents: docs } });
}

export async function findDoc(id: string): Promise<{ ownerId: string; doc: DocMeta } | null> {
  for (const u of await listAuthUsers()) {
    const docs = (u.user_metadata?.documents ?? []) as DocMeta[];
    const doc = docs.find((d) => d.id === id);
    if (doc) return { ownerId: u.id, doc };
  }
  return null;
}

export async function readText(path: string): Promise<string> {
  const { data } = await createAdminClient().storage.from(BUCKET).download(path);
  return data ? await data.text() : "";
}
