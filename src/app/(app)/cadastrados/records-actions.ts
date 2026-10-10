"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_ACOMP, FORM_KEY, OTHER_PREFIX, PROFESSIONAL_KEYS } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { accessOf, loadRecord, saveRecord, type Ans, type HistoryEntry, type Scope } from "@/lib/records";

const scopeOf = (f: FormData): Scope => (f.get("scope") === "acompanhamento" ? "acompanhamento" : "formulario");
const done = (id: string) => { revalidatePath(`/cadastrados/${id}`); revalidatePath("/usuarios", "layout"); };

async function open(id: string) {
  const me = await requireMember();
  const rec = await loadRecord(id);
  if (!rec) throw new Error("Formulário não encontrado.");
  return { me, rec, acc: accessOf(rec, me) };
}

// "Check-out": quem começa a editar aparece como editando, sem sair da página.
export async function startEdit(id: string, scope: Scope) {
  const { me, rec, acc } = await open(id);
  if (!acc.canEdit) return;
  const meta = rec.meta;
  meta.editing[me.id] = { name: me.name || me.email, scope, since: new Date().toISOString() };
  await saveRecord(rec, {}, meta);
  done(id);
}

export async function stopEdit(id: string) {
  const { me, rec } = await open(id);
  const meta = rec.meta;
  delete meta.editing[me.id];
  await saveRecord(rec, {}, meta);
  done(id);
}

export async function saveRecordEdit(_: string | null, form: FormData) {
  const id = String(form.get("record_id"));
  const scope = scopeOf(form);
  const { me, rec, acc } = await open(id);
  if (!acc.canEdit) return "Você não tem permissão para editar.";

  const formKey = scope === "acompanhamento" ? FORM_ACOMP : FORM_KEY;
  const { questions } = await loadQuestions(await createClient(), formKey, rec.created_by, true);
  const current: Ans = scope === "acompanhamento" ? { ...(rec.followup ?? {}) } : { ...rec.answers };

  const next: Ans = { ...current };
  const changes: HistoryEntry["changes"] = [];
  for (const q of questions) {
    if (PROFESSIONAL_KEYS.includes(q.key)) continue; // assinatura não muda
    let value: string;
    if (q.type === "checkbox") value = form.getAll(q.key).map((v) => String(v).trim()).filter(Boolean).join("; ");
    else value = String(form.get(q.key) ?? "").trim();
    if (q.type === "radio_other" && value === "__outro__") {
      const other = String(form.get(`${q.key}__outro`) ?? "").trim();
      value = other ? OTHER_PREFIX + other : "";
    }
    if (q.required && !value) return `Preencha: ${q.label}`;
    const before = current[q.key]?.value ?? "";
    if (value === before) continue;
    changes.push({ label: q.label, from: before, to: value });
    if (value) next[q.key] = { label: q.label, value };
    else delete next[q.key];
  }
  if (changes.length === 0 && !(scope === "acompanhamento" && !rec.followup)) return "Nenhuma alteração para salvar.";

  const meta = rec.meta;
  delete meta.editing[me.id];
  meta.history.unshift({
    at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope, changes,
    note: scope === "acompanhamento" && !rec.followup ? "preencheu o acompanhamento" : undefined,
  });
  meta.history = meta.history.slice(0, 200);

  const r = scope === "acompanhamento"
    ? await saveRecord(rec, { followup: next, followupAt: new Date().toISOString() }, meta)
    : await saveRecord(rec, { answers: next }, meta);
  if (r.error) return "Não foi possível salvar.";
  done(id);
  return "ok";
}

export async function shareRecord(form: FormData) {
  const id = String(form.get("record_id"));
  const who = String(form.get("member_id") ?? "");
  const { rec, acc } = await open(id);
  if (!acc.canShare || !who || who === rec.created_by) return;
  const { data: m } = await createAdminClient().from("members").select("id, name, email, status").eq("id", who).maybeSingle();
  if (!m || m.status !== "approved") return;
  const meta = rec.meta;
  if (!meta.shared.some((s) => s.id === who)) meta.shared.push({ id: who, name: (m.name as string) || (m.email as string) });
  await saveRecord(rec, {}, meta);
  done(id);
}

export async function unshareRecord(form: FormData) {
  const id = String(form.get("record_id"));
  const who = String(form.get("member_id"));
  const { rec, acc } = await open(id);
  if (!acc.canShare) return;
  const meta = rec.meta;
  meta.shared = meta.shared.filter((s) => s.id !== who);
  delete meta.editing[who];
  await saveRecord(rec, {}, meta);
  done(id);
}

export async function deleteRecord(form: FormData) {
  const id = String(form.get("record_id"));
  const { me, rec, acc } = await open(id);
  if (!acc.owner && !acc.admin) return;
  await createAdminClient().from("intake_records").delete().eq("id", rec.id);
  revalidatePath("/usuarios", "layout");
  const { redirect } = await import("next/navigation");
  redirect(`/usuarios/${me.id}`);
}
