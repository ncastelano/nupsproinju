"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessOf, loadRecord, saveRecord, type AudioEntry } from "@/lib/records";
import { emptyPara, parseDocx, serializeDocx, type Para } from "@/lib/docxDoc";
import { DOC_BUCKET, INICIAL, loadProcessDoc, storeProcessDoc, type DocRef } from "@/lib/procDoc";

const MAX_BYTES = 12 * 1024 * 1024;

// "inicial" | "acomp:N" | "fisc" | "nota" -> referência do documento
const refFrom = (doc: string): DocRef => {
  if (doc === "fisc") return { kind: "fisc" };
  if (doc === "nota") return { kind: "nota" };
  const m = doc.match(/^acomp:(\d+)$/);
  return m ? { kind: "acomp", n: Number(m[1]) } : INICIAL;
};

async function open(id: string) {
  const me = await requireMember();
  const rec = await loadRecord(id, null);
  if (!rec) throw new Error("Relatório não encontrado.");
  if (rec.form_key === "nota" ? rec.created_by !== me.id : !accessOf(rec, me).canEdit) throw new Error("Sem permissão.");
  return { me, rec };
}

// Guarda um áudio gravado (com a transcrição, se houver) neste relatório.
export async function saveAudio(form: FormData): Promise<string> {
  try {
    const id = String(form.get("record_id"));
    const doc = String(form.get("doc") ?? "inicial");
    const file = form.get("file");
    const transcript = String(form.get("transcript") ?? "").slice(0, 20000);
    const secs = Math.max(0, Math.round(Number(form.get("secs") ?? 0)));
    if (!(file instanceof File) || file.size === 0) return "Nenhum áudio gravado.";
    if (file.size > MAX_BYTES) return "O áudio é muito grande (limite de 12 MB).";
    if (!file.type.startsWith("audio/")) return "Arquivo de áudio inválido.";
    const { me, rec } = await open(id);

    const aid = crypto.randomUUID();
    const ext = file.type.includes("mp4") ? "m4a" : file.type.includes("ogg") ? "ogg" : "webm";
    const path = `audios/${id}/${aid}.${ext}`;
    const up = await createAdminClient().storage.from(DOC_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type.split(";")[0], upsert: false,
    });
    if (up.error) return "Não foi possível guardar o áudio.";

    const meta = rec.meta;
    const entry: AudioEntry = {
      id: aid, path, mime: file.type.split(";")[0], secs, size: file.size,
      by_id: me.id, by_name: me.name || me.email, at: new Date().toISOString(), doc, transcript,
    };
    meta.audios = [entry, ...(meta.audios ?? [])];
    if (rec.form_key !== "nota") {
      meta.history.unshift({ at: entry.at, by_id: me.id, by_name: entry.by_name, scope: "formulario", changes: [], note: transcript ? "gravou um áudio (com transcrição)" : "gravou um áudio", doc });
      meta.history = meta.history.slice(0, 200);
    }
    await saveRecord(rec, {}, meta);
    revalidatePath(`/cadastrados/${id}`);
    return "ok";
  } catch (e) {
    return e instanceof Error ? e.message : "Não foi possível guardar o áudio.";
  }
}

export async function saveTranscript(id: string, audioId: string, text: string): Promise<string> {
  try {
    const { rec } = await open(id);
    const a = rec.meta.audios?.find((x) => x.id === audioId);
    if (!a) return "Áudio não encontrado.";
    a.transcript = text.slice(0, 20000);
    await saveRecord(rec, {}, rec.meta);
    return "ok";
  } catch (e) { return e instanceof Error ? e.message : "Erro."; }
}

export async function deleteAudio(id: string, audioId: string): Promise<string> {
  try {
    const { me, rec, } = await open(id);
    const a = rec.meta.audios?.find((x) => x.id === audioId);
    if (!a) return "Áudio não encontrado.";
    if (a.by_id !== me.id && !accessOf(rec, me).owner && me.role !== "admin") return "Só quem gravou (ou o administrador) pode apagar.";
    await createAdminClient().storage.from(DOC_BUCKET).remove([a.path]);
    rec.meta.audios = (rec.meta.audios ?? []).filter((x) => x.id !== audioId);
    await saveRecord(rec, {}, rec.meta);
    revalidatePath(`/cadastrados/${id}`);
    return "ok";
  } catch (e) { return e instanceof Error ? e.message : "Erro."; }
}

// Acrescenta a transcrição ao fim do documento (como parágrafos do texto).
export async function insertTranscript(id: string, audioId: string): Promise<string> {
  try {
    const { me, rec } = await open(id);
    const a = rec.meta.audios?.find((x) => x.id === audioId);
    if (!a || !a.transcript.trim()) return "Este áudio ainda não tem transcrição.";
    const ref = refFrom(a.doc);
    const doc = await loadProcessDoc(rec, ref, me);
    if (!doc) return "Documento indisponível.";
    const data = await parseDocx(doc.buf);
    const when = new Date(a.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const head: Para = { ...emptyPara(), runs: [{ t: `Transcrição de áudio — ${a.by_name}, ${when}`, b: true, sz: 24 }] };
    const body: Para[] = a.transcript.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      .map((l) => ({ ...emptyPara(), jc: "both" as const, runs: [{ t: l, sz: 24 }] }));
    const buf = await serializeDocx(doc.buf, [...data.blocks, emptyPara(), head, ...body], { comments: data.comments });
    const r = await storeProcessDoc(id, buf, ref);
    if (r.error) return "Não foi possível inserir no documento.";
    revalidatePath(`/cadastrados/${id}`);
    return "ok";
  } catch (e) { return e instanceof Error ? e.message : "Erro."; }
}
