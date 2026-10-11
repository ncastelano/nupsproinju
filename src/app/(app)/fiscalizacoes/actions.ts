"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { accessOf, loadRecord, saveRecord, type Ans, type HistoryEntry } from "@/lib/records";
import { DOC_BUCKET, docPath, removeProcessDocs } from "@/lib/procDoc";
import { FISC_KEY, FISC_SECTIONS, OTHER, UNIDADES, rowKey, visible } from "@/lib/fisc";

const refresh = () => revalidatePath("/fiscalizacoes");

// Agenda uma visita (unidade, data e profissionais); o questionário é respondido depois.
export async function scheduleVisit(_: string | null, form: FormData): Promise<string | null> {
  const me = await requireMember();
  const unit = String(form.get("unit") ?? "");
  const date = String(form.get("date") ?? "");
  const professionals = form.getAll("professionals").map((v) => String(v).trim()).filter(Boolean);
  if (!UNIDADES.includes(unit)) return "Escolha a unidade.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Informe a data da visita.";
  if (professionals.length === 0) return "Marque pelo menos um profissional.";

  const answers = {
    q1: { label: "Unidade fiscalizada", value: unit },
    q2: { label: "Data da fiscalização", value: date },
    q3: { label: "Profissional(is) responsável(is)", value: professionals.join("; ") },
    _meta: {
      shared: [], followups: [], acomps: [], editing: {},
      history: [{ at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "formulario", changes: [], note: "agendou a fiscalização", doc: "fisc" }],
      visit: { unit, date, professionals, status: "agendada" },
    },
  };
  const { error } = await createAdminClient().from("intake_records").insert({ form_key: FISC_KEY, created_by: me.id, answers });
  if (error) return "Não foi possível agendar. Tente de novo.";
  refresh();
  return "ok";
}

// Salva as respostas do questionário e (re)gera o relatório da fiscalização.
export async function saveResponses(_: string | null, form: FormData): Promise<string | null> {
  const id = String(form.get("record_id"));
  const me = await requireMember();
  const rec = await loadRecord(id, FISC_KEY);
  if (!rec) return "Fiscalização não encontrada.";
  if (!accessOf(rec, me).canEdit) return "Você não tem permissão para editar.";

  const draft = form.get("intent") === "draft";
  const next: Ans = {};
  const get = (k: string) => (next[k]?.value ?? "").trim();
  for (const sec of FISC_SECTIONS) {
    for (const qn of sec.questions) {
      if (!visible(qn, get)) continue;
      if (qn.type === "matrix") {
        (qn.rows ?? []).forEach((r, i) => {
          const v = String(form.get(rowKey(qn.key, i)) ?? "").trim();
          if (v) next[rowKey(qn.key, i)] = { label: `${qn.label} — ${r}`, value: v };
        });
        continue;
      }
      let value: string;
      if (qn.type === "checkbox") {
        const outro = String(form.get(`${qn.key}__outro`) ?? "").trim();
        value = form.getAll(qn.key).map((v) => String(v).trim()).filter(Boolean)
          .map((v) => (v === "Outro" ? (outro ? OTHER + outro : "") : v)).filter(Boolean).join("; ");
      } else if (qn.type === "radio" && qn.other && String(form.get(qn.key)) === "Outro") {
        const outro = String(form.get(`${qn.key}__outro`) ?? "").trim();
        value = outro ? OTHER + outro : "";
      } else value = String(form.get(qn.key) ?? "").trim();
      if (qn.required && !value && !draft && ["q1", "q2", "q3"].includes(qn.key)) return `Preencha: ${qn.label}`;
      if (value) next[qn.key] = { label: qn.label, value: value.slice(0, 8000) };
    }
  }

  const unit = next.q1?.value ?? rec.meta.visit?.unit ?? "";
  const date = next.q2?.value ?? rec.meta.visit?.date ?? "";
  const professionals = (next.q3?.value ?? "").split("; ").filter(Boolean);
  const meta = rec.meta;
  const first = meta.visit?.status !== "realizada";
  if (draft) {
    // rascunho: guarda as respostas e continua como visita a responder
    meta.visit = { unit, date, professionals, status: meta.visit?.status ?? "agendada", draft: true,
      responded_at: meta.visit?.responded_at, responded_by: meta.visit?.responded_by };
    const note = "salvou o rascunho do questionário";
    const last = meta.history[0];
    if (!(last && last.by_id === me.id && last.note === note)) {
      meta.history.unshift({ at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "formulario", changes: [], note, doc: "fisc" });
      meta.history = meta.history.slice(0, 200);
    }
    const r = await saveRecord(rec, { answers: next }, meta);
    if (r.error) return "Não foi possível salvar o rascunho.";
    refresh();
    revalidatePath("/processos");
    redirect("/fiscalizacoes");
  }
  meta.visit = {
    unit, date, professionals, status: "realizada", draft: false,
    responded_at: new Date().toISOString(), responded_by: me.name || me.email,
  };
  const entry: HistoryEntry = {
    at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "formulario", changes: [],
    note: first ? "respondeu o questionário da fiscalização" : "atualizou as respostas do questionário (relatório refeito)", doc: "fisc",
  };
  meta.history = [entry, ...meta.history].slice(0, 200);

  const r = await saveRecord(rec, { answers: next }, meta);
  if (r.error) return "Não foi possível salvar.";
  await createAdminClient().storage.from(DOC_BUCKET).remove([docPath(id, { kind: "fisc" })]); // regenera a partir das respostas
  refresh();
  revalidatePath("/processos");
  redirect(`/fiscalizacoes/${id}`);
}

export async function deleteFiscalizacao(id: string): Promise<string> {
  const me = await requireMember();
  const rec = await loadRecord(id, FISC_KEY);
  if (!rec) return "Fiscalização não encontrada.";
  const acc = accessOf(rec, me);
  if (!acc.owner && !acc.admin) return "Você não tem permissão para apagar.";
  const { error } = await createAdminClient().from("intake_records").delete().eq("id", id);
  if (error) return "Não foi possível apagar. Tente de novo.";
  await removeProcessDocs(id).catch(() => {});
  refresh();
  return "ok";
}
