"use server";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOC_BUCKET, docVersion, type DocRef } from "@/lib/procDoc";

// Quem está com o documento aberto para editar agora. Fica num arquivo à parte (não mexe na ficha do relatório);
// cada pessoa "bate o ponto" a cada ~20 s e o registro vale 60 s.
type Entry = { name: string; at: number };
type File = Record<string, Record<string, Entry>>; // chave do documento -> id da pessoa -> registro
const TTL = 60_000;
const refOf = (r: unknown): DocRef => {
  const o = (r ?? {}) as { kind?: string; n?: number };
  return o.kind === "acomp" ? { kind: "acomp", n: Number(o.n) } : o.kind === "fisc" ? { kind: "fisc" } : { kind: "inicial" };
};
const keyOf = (r: DocRef) => (r.kind === "acomp" ? `acomp:${r.n}` : r.kind);

export async function pingEditing(id: string, refIn: unknown, editing: boolean): Promise<{ others: string[]; version: string }> {
  const me = await requireMember();
  const ref = refOf(refIn);
  const key = keyOf(ref);
  const st = createAdminClient().storage.from(DOC_BUCKET);
  const path = `presenca/${id}.json`;
  let file: File = {};
  const got = await st.download(path);
  if (got.data) { try { file = JSON.parse(await got.data.text()); } catch { file = {}; } }
  const now = Date.now();
  let changed = false;
  for (const k of Object.keys(file)) for (const [uid, e] of Object.entries(file[k])) {
    if (now - e.at > TTL) { delete file[k][uid]; changed = true; }
  }
  const mine = file[key]?.[me.id];
  if (editing) {
    (file[key] ??= {})[me.id] = { name: me.name || me.email, at: now };
    changed = true;
  } else if (mine) { delete file[key][me.id]; changed = true; }
  if (changed) await st.upload(path, Buffer.from(JSON.stringify(file)), { contentType: "application/json", upsert: true });
  const others = Object.entries(file[key] ?? {}).filter(([uid]) => uid !== me.id).map(([, e]) => e.name);
  return { others, version: (await docVersion(id, ref)) ?? "" };
}
