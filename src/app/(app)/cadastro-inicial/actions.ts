"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_ACOMP, FORM_KEY, OTHER_PREFIX, PROFESSIONAL_KEYS } from "@/lib/forms";
import { loadQuestions } from "@/lib/questions";
import { loadRecord, saveRecord, type Ans } from "@/lib/records";

// Cadastro inicial cria a ficha; Acompanhamento preenche/atualiza a MESMA ficha (coluna followup).
export async function saveIntake(_: string | null, form: FormData) {
  const me = await requireMember();
  const formKey = form.get("form_key") === FORM_ACOMP ? FORM_ACOMP : FORM_KEY;
  const supabase = await createClient();
  const draft = form.get("intent") === "draft" && formKey === FORM_KEY; // rascunho: salva sem exigir tudo
  const draftId = String(form.get("draft_id") ?? "");

  let recordId: string | null = null;
  if (formKey === FORM_ACOMP) {
    recordId = String(form.get("record_id") ?? "") || null;
    if (!recordId) return "Escolha o acolhido do acompanhamento.";
  }

  const { questions, typeName, template } = await loadQuestions(supabase, formKey, me.id, true);
  const signature = [me.name || me.email, me.registry].filter(Boolean).join(" - ");

  const answers: Record<string, { label: string; value: string }> = {};
  for (const q of questions) {
    let value: string;
    if (PROFESSIONAL_KEYS.includes(q.key)) {
      // quem está logado sempre assina; outros profissionais podem ser marcados junto
      if (!me.registry && !draft) return "Informe o seu CRP ou CRESS no perfil antes de salvar.";
      if (q.type === "checkbox") {
        const picked = form.getAll(q.key).map((v) => String(v).trim()).filter(Boolean);
        if (!picked.includes(signature)) picked.unshift(signature);
        value = picked.join(", ");
      } else value = signature;
    } else if (q.type === "checkbox") {
      const outro = String(form.get(`${q.key}__outro`) ?? "").trim();
      value = form.getAll(q.key).map((v) => String(v).trim()).filter(Boolean)
        .map((v) => (v === "Outro" ? (outro ? OTHER_PREFIX + outro : "") : v)).filter(Boolean).join("; ");
    } else {
      value = String(form.get(q.key) ?? "").trim();
    }
    if (q.type === "radio_other" && value === "__outro__") {
      const other = String(form.get(`${q.key}__outro`) ?? "").trim();
      value = other ? OTHER_PREFIX + other : "";
    }
    if (q.required && !value && !draft) return `Preencha: ${q.label}`;
    if (value) answers[q.key] = { label: q.label, value };
  }

  if (formKey === FORM_KEY) {
    answers._template = { label: "Modelo de formulário", value: typeName };
    answers._template_id = { label: "Modelo", value: template.id };
  }

  let newId: string | null = null;
  const before = formKey === FORM_ACOMP && recordId ? await loadRecord(recordId) : null;

  if (formKey === FORM_ACOMP) {
    const { data: upd, error } = await supabase
      .from("intake_records")
      .update({ followup: answers, followup_at: new Date().toISOString() })
      .eq("id", recordId!).eq("form_key", FORM_KEY).select("id");
    if (error || !upd?.length) return "Não foi possível salvar o acompanhamento.";
    if (before) {
      // registra no histórico quem alterou o acompanhamento
      const old: Ans = before.followup ?? {};
      const changes = Object.keys({ ...old, ...answers })
        .filter((k) => !PROFESSIONAL_KEYS.includes(k) && (old[k]?.value ?? "") !== (answers[k]?.value ?? ""))
        .map((k) => ({ label: (answers[k] ?? old[k]).label, from: old[k]?.value ?? "", to: answers[k]?.value ?? "" }));
      const meta = before.meta;
      delete meta.editing[me.id];
      if (changes.length || !before.followup) {
        meta.history.unshift({
          at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "acompanhamento",
          changes, note: before.followup ? undefined : "preencheu o acompanhamento",
        });
        meta.history = meta.history.slice(0, 200);
        await saveRecord(before, {}, meta);
      }
    }
  } else if (draftId) {
    // continua um rascunho já salvo (ou o finaliza)
    const rec = await loadRecord(draftId);
    if (!rec) return "Rascunho não encontrado.";
    const meta = rec.meta;
    meta.draft = draft;
    if (!draft) {
      meta.history.unshift({
        at: new Date().toISOString(), by_id: me.id, by_name: me.name || me.email, scope: "formulario", changes: [],
        note: "concluiu o cadastro inicial", doc: "inicial",
      });
    }
    const r = await saveRecord(rec, { answers }, meta);
    if (r.error) return "Não foi possível salvar. Tente novamente.";
    newId = rec.id;
  } else {
    const row = draft ? { ...answers, _meta: { shared: [], followups: [], history: [], acomps: [], editing: {}, draft: true } } : answers;
    const { data: ins, error } = await supabase
      .from("intake_records").insert({ form_key: FORM_KEY, created_by: me.id, answers: row }).select("id").single();
    if (error || !ins) return "Não foi possível salvar. Tente novamente.";
    newId = ins.id as string;
  }
  revalidatePath("/banco-de-dados");
  revalidatePath("/banco-de-dados", "layout");
  revalidatePath("/processos");
  if (draft && newId) return `draft:${newId}`;
  return newId ? `ok:${newId}` : "ok";
}
