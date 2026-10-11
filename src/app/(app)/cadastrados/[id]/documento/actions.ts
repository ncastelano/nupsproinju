"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessOf, loadRecord, saveRecord } from "@/lib/records";
import { cleanParas, serializeDocx } from "@/lib/docxDoc";
import { DOC_BUCKET, docPath, docVersion, loadProcessDoc, storeProcessDoc } from "@/lib/procDoc";

const SAME_USER_MS = 30 * 60 * 1000;

async function note(id: string, text: string) {
  const me = await requireMember();
  const rec = await loadRecord(id);
  if (!rec) return;
  const meta = rec.meta;
  const last = meta.history[meta.history.length - 1];
  if (last && last.by_id === me.id && last.note === text && Date.now() - new Date(last.at).getTime() < SAME_USER_MS) {
    last.at = new Date().toISOString();
  } else {
    meta.history.push({ at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "formulario", changes: [], note: text });
  }
  await saveRecord(rec, {}, meta);
}

// Salva o documento editado na tela. "base" é a versão que a pessoa abriu: se outra pessoa salvou depois, avisa.
export async function saveDocument(id: string, paras: unknown, base: string): Promise<{ ok: boolean; msg: string; version?: string }> {
  const me = await requireMember();
  const rec = await loadRecord(id);
  if (!rec) return { ok: false, msg: "Processo não encontrado." };
  if (!accessOf(rec, me).canEdit) return { ok: false, msg: "Você não tem permissão para editar." };
  const clean = cleanParas(paras);
  if (!clean) return { ok: false, msg: "Documento inválido." };

  const current = await docVersion(id);
  if (current && base && current !== base) {
    return { ok: false, msg: "Outra pessoa salvou este documento depois que você abriu. Recarregue a página para ver a versão mais nova." };
  }
  const doc = await loadProcessDoc(rec);
  if (!doc) return { ok: false, msg: "Modelo do relatório indisponível." };
  const buf = await serializeDocx(doc.buf, clean);
  const { error } = await storeProcessDoc(id, buf);
  if (error) return { ok: false, msg: "Não foi possível salvar. Tente de novo." };
  await note(id, "editou o documento do processo");
  revalidatePath(`/cadastrados/${id}`);
  return { ok: true, msg: "Documento salvo.", version: (await docVersion(id)) ?? "" };
}

// Descarta as edições e gera o documento de novo a partir do Cadastro inicial.
export async function resetDocument(id: string): Promise<{ ok: boolean; msg: string }> {
  const me = await requireMember();
  const rec = await loadRecord(id);
  if (!rec) return { ok: false, msg: "Processo não encontrado." };
  if (!accessOf(rec, me).canEdit) return { ok: false, msg: "Você não tem permissão para editar." };
  await createAdminClient().storage.from(DOC_BUCKET).remove([docPath(id)]);
  await note(id, "refez o documento a partir do cadastro inicial");
  revalidatePath(`/cadastrados/${id}/documento`);
  return { ok: true, msg: "Documento refeito." };
}
