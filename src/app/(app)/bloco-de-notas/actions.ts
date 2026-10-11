"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTA_KEY } from "@/lib/notes";
import { DOC_BUCKET, docPath } from "@/lib/procDoc";

async function mine(id: string) {
  const me = await requireMember();
  const { data } = await createAdminClient().from("intake_records").select("id, created_by, answers")
    .eq("id", id).eq("form_key", NOTA_KEY).maybeSingle();
  if (!data || data.created_by !== me.id) return null;
  return { me, rec: data as { id: string; created_by: string; answers: Record<string, unknown> } };
}

export async function createNote(title?: string): Promise<string> {
  const me = await requireMember();
  const t = (title ?? "").trim().slice(0, 80) || "Nota sem título";
  const { data, error } = await createAdminClient().from("intake_records")
    .insert({ form_key: NOTA_KEY, created_by: me.id, answers: { titulo: { label: "Título", value: t }, visibilidade: { label: "Visibilidade", value: "servico" }, _meta: { shared: [], followups: [], acomps: [], editing: {}, history: [] } } })
    .select("id").single();
  if (error || !data) throw new Error("Não foi possível criar a nota.");
  revalidatePath("/bloco-de-notas");
  return data.id as string;
}

export async function newNoteAction() {
  const id = await createNote();
  redirect(`/bloco-de-notas?n=${id}`);
}

export async function renameNote(id: string, title: string): Promise<string> {
  const m = await mine(id);
  if (!m) return "Nota não encontrada.";
  const t = title.trim().slice(0, 80) || "Nota sem título";
  const answers = { ...m.rec.answers, titulo: { label: "Título", value: t } };
  const { error } = await createAdminClient().from("intake_records").update({ answers }).eq("id", id);
  if (error) return "Não foi possível renomear.";
  revalidatePath("/bloco-de-notas");
  return "ok";
}

export async function deleteNote(id: string): Promise<string> {
  const m = await mine(id);
  if (!m) return "Nota não encontrada.";
  await createAdminClient().storage.from(DOC_BUCKET).remove([docPath(id, { kind: "nota" })]);
  const { error } = await createAdminClient().from("intake_records").delete().eq("id", id);
  if (error) return "Não foi possível apagar.";
  revalidatePath("/bloco-de-notas");
  return "ok";
}

// Quem pode ver a nota: "servico" (só quem tem conta no sistema) ou "publico" (qualquer pessoa com o link, e no perfil público).
export async function setNoteVisibility(id: string, visibility: "publico" | "servico"): Promise<string> {
  const m = await mine(id);
  if (!m) return "Nota não encontrada.";
  const answers = { ...m.rec.answers, visibilidade: { label: "Visibilidade", value: visibility === "publico" ? "publico" : "servico" } };
  const { error } = await createAdminClient().from("intake_records").update({ answers }).eq("id", id);
  if (error) return "Não foi possível alterar.";
  revalidatePath("/bloco-de-notas");
  return "ok";
}
