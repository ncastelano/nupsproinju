"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { FISC_KEY } from "@/lib/fisc";
import { accessOf, loadRecord, saveRecord, type HistoryEntry } from "@/lib/records";
import { cleanParas, parseDocx, serializeDocx, type Para } from "@/lib/docxDoc";
import { ACOMP_GROUPS } from "@/lib/acomp";
import { DOC_BUCKET, INICIAL, generateDoc, docPath, docVersion, loadProcessDoc, refKey, storeProcessDoc, type DocRef } from "@/lib/procDoc";

const SAME_USER_MS = 30 * 60 * 1000;

const refOf = (r: unknown): DocRef => {
  const o = (r ?? {}) as { kind?: string; n?: number };
  if (o.kind === "fisc") return { kind: "fisc" };
  if (o.kind === "acomp" && Number.isInteger(o.n)) return { kind: "acomp", n: o.n as number };
  return INICIAL;
};
// cadastro inicial/acompanhamento usam registros de processo; fiscalização usa o seu próprio tipo
const formOf = (ref: DocRef) => (ref.kind === "fisc" ? FISC_KEY : FORM_KEY);

const textsOf = (paras: Para[]) => paras.map((p) => p.runs.map((r) => r.t).join("").trim()).filter(Boolean);
const cut = (s: string) => (s.length > 220 ? s.slice(0, 220) + "…" : s);

// O que entrou e o que saiu do texto (por parágrafo), para o histórico de atividades.
function diffParas(before: Para[], after: Para[]): HistoryEntry["changes"] {
  const left = new Map<string, number>();
  for (const t of textsOf(before)) left.set(t, (left.get(t) ?? 0) + 1);
  const added: string[] = [];
  for (const t of textsOf(after)) {
    const n = left.get(t) ?? 0;
    if (n > 0) left.set(t, n - 1); else added.push(t);
  }
  const removed = [...left.entries()].flatMap(([t, n]) => Array<string>(n).fill(t));
  return [
    ...removed.slice(0, 10).map((t) => ({ label: "Removido", from: cut(t), to: "" })),
    ...added.slice(0, 10).map((t) => ({ label: "Adicionado", from: "", to: cut(t) })),
  ];
}

async function note(id: string, text: string, doc: string, changes: HistoryEntry["changes"] = []) {
  const me = await requireMember();
  const rec = await loadRecord(id, null);
  if (!rec) return;
  const meta = rec.meta;
  const last = meta.history[0];
  const sameAuthor = last && last.by_id === me.id && last.note === text && last.doc === doc
    && Date.now() - new Date(last.at).getTime() < SAME_USER_MS;
  if (sameAuthor) {
    // mesma pessoa editando em seguida: junta numa atividade só
    last.at = new Date().toISOString();
    last.changes = [...changes, ...last.changes].slice(0, 20);
  } else {
    meta.history.unshift({ at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "formulario", changes, note: text, doc });
  }
  meta.history = meta.history.slice(0, 200);
  await saveRecord(rec, {}, meta);
}

const label = (ref: DocRef) => (ref.kind === "acomp" ? `o acompanhamento nº ${ref.n}` : ref.kind === "fisc" ? "o relatório da fiscalização" : "o documento do processo");

// Salva o documento editado na tela. "base" é a versão que a pessoa abriu: se outra pessoa salvou depois, avisa.
export async function saveDocument(id: string, paras: unknown, base: string, refIn?: unknown): Promise<{ ok: boolean; msg: string; version?: string }> {
  const ref = refOf(refIn);
  const me = await requireMember();
  const rec = await loadRecord(id, formOf(ref));
  if (!rec) return { ok: false, msg: "Processo não encontrado." };
  if (!accessOf(rec, me).canEdit) return { ok: false, msg: "Você não tem permissão para editar." };
  const clean = cleanParas(paras);
  if (!clean) return { ok: false, msg: "Documento inválido." };

  const current = await docVersion(id, ref);
  if (current && base && current !== base) {
    return { ok: false, msg: "Outra pessoa salvou este documento depois que você abriu. Recarregue a página para ver a versão mais nova." };
  }
  const doc = await loadProcessDoc(rec, ref, me);
  if (!doc) return { ok: false, msg: "Modelo do relatório indisponível." };
  const changes = diffParas((await parseDocx(doc.buf)).paras, clean);
  const buf = await serializeDocx(doc.buf, clean);
  const { error } = await storeProcessDoc(id, buf, ref);
  if (error) return { ok: false, msg: "Não foi possível salvar. Tente de novo." };
  if (changes.length) await note(id, `editou ${label(ref)}`, refKey(ref), changes);
  revalidatePath(`/cadastrados/${id}`);
  revalidatePath("/processos");
  revalidatePath("/acompanhamento");
  revalidatePath("/fiscalizacoes");
  return { ok: true, msg: "Documento salvo.", version: (await docVersion(id, ref)) ?? "" };
}

// Descarta as edições e gera o documento de novo a partir do modelo.
export async function resetDocument(id: string, refIn?: unknown): Promise<{ ok: boolean; msg: string }> {
  const ref = refOf(refIn);
  const me = await requireMember();
  const rec = await loadRecord(id, formOf(ref));
  if (!rec) return { ok: false, msg: "Processo não encontrado." };
  if (!accessOf(rec, me).canEdit) return { ok: false, msg: "Você não tem permissão para editar." };
  await createAdminClient().storage.from(DOC_BUCKET).remove([docPath(id, ref)]);
  await note(id, `refez ${label(ref)} do início`, refKey(ref));
  revalidatePath(`/cadastrados/${id}`);
  return { ok: true, msg: "Documento refeito." };
}

// Salva o questionário do acompanhamento (novo ou já existente) e gera o relatório a partir das respostas.
export async function saveAcompanhamento(_: string | null, form: FormData): Promise<string | null> {
  const id = String(form.get("record_id"));
  const nRaw = String(form.get("n") ?? "");
  const me = await requireMember();
  const rec = await loadRecord(id);
  if (!rec) return "Processo não encontrado.";
  if (!accessOf(rec, me).canEdit) return "Você não tem permissão para editar.";

  const meta = rec.meta;
  const draft = form.get("intent") === "draft";
  const isNew = nRaw === "";
  const n = isNew ? Math.max(0, ...meta.acomps.map((a) => a.n)) + 1 : Number(nRaw);
  const existing = meta.acomps.find((a) => a.n === n);
  if (!isNew && !existing) return "Acompanhamento não encontrado.";
  if (meta.draft) return "Conclua o Cadastro inicial deste processo antes de fazer o acompanhamento.";

  const answers: Record<string, string> = {};
  for (const g of ACOMP_GROUPS) for (const f of g.fields) {
    const v = String(form.get(f.key) ?? "").replace(/\r/g, "").trim().slice(0, 8000);
    if (v) answers[f.key] = v;
  }
  meta.acompData = { ...(meta.acompData ?? {}), [String(n)]: answers };
  const at = new Date().toISOString();
  const wasDraft = !!existing?.draft;
  if (isNew) meta.acomps.push({ n, at, by_id: me.id, by_name: me.name || me.email, draft });
  else if (existing) { existing.draft = draft; }

  const who = { by_id: me.id, by_name: me.name || me.email };
  if (draft) {
    // rascunho: guarda as respostas, sem gerar o documento
    if (isNew) meta.history.unshift({ at, ...who, scope: "acompanhamento", changes: [], doc: `acomp:${n}`, note: `salvou o rascunho do acompanhamento nº ${n}` });
    meta.history = meta.history.slice(0, 200);
    const r = await saveRecord(rec, {}, meta);
    if (r.error) return "Não foi possível salvar o rascunho.";
    revalidatePath("/processos");
    redirect("/processos");
  }

  meta.history.unshift({
    at, ...who, scope: "acompanhamento", changes: [], doc: `acomp:${n}`,
    note: isNew || wasDraft ? `criou o acompanhamento nº ${n}` : `atualizou as respostas do acompanhamento nº ${n} (documento refeito)`,
  });
  meta.history = meta.history.slice(0, 200);

  const ref: DocRef = { kind: "acomp", n };
  const buf = await generateDoc({ ...rec, meta }, ref, me);
  if (!buf) return "Modelo do acompanhamento indisponível.";
  const up = await storeProcessDoc(id, buf, ref);
  if (up.error) return "Não foi possível gerar o documento. Tente de novo.";
  const r = await saveRecord(rec, {}, meta);
  if (r.error) return "Não foi possível salvar.";
  revalidatePath("/acompanhamento");
  revalidatePath("/processos");
  redirect(`/cadastrados/${id}/acompanhamento/${n}`);
}

export async function deleteAcompanhamento(id: string, n: number): Promise<string> {
  const me = await requireMember();
  const rec = await loadRecord(id);
  if (!rec) return "Processo não encontrado.";
  const acc = accessOf(rec, me);
  if (!acc.owner && !acc.admin) return "Você não tem permissão para apagar.";
  const meta = rec.meta;
  meta.acomps = meta.acomps.filter((a) => a.n !== n);
  meta.history.unshift({
    at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "acompanhamento",
    changes: [], note: `apagou o acompanhamento nº ${n}`, doc: `acomp:${n}`,
  });
  await createAdminClient().storage.from(DOC_BUCKET).remove([docPath(id, { kind: "acomp", n })]);
  const r = await saveRecord(rec, {}, meta);
  if (r.error) return "Não foi possível apagar. Tente de novo.";
  revalidatePath("/acompanhamento");
  return "ok";
}
