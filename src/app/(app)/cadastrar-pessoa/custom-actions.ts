"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { requireMember } from "@/lib/auth";
import { FORM_KEYS, FORM_KEY, type Question, type QuestionType } from "@/lib/forms";
import {
  BASE_ID, emptyDelta, getActiveTemplate, newTemplateId, removeTemplate, saveTemplate,
  setActiveTemplate, findTemplate, type Template,
} from "@/lib/templates";

const TYPES: QuestionType[] = ["text", "textarea", "date", "select", "radio", "radio_other", "checkbox"];
const NEEDS = ["select", "radio", "radio_other", "checkbox"];
const lines = (s: string) => [...new Set(s.split("\n").map((x) => x.trim()).filter(Boolean))];
const refresh = () => {
  revalidatePath("/cadastrar-pessoa");
  revalidatePath("/modelos-de-formularios", "layout");
  revalidatePath("/usuarios", "layout");
};
const formKeyOf = (f: FormData) => {
  const k = String(f.get("form_key"));
  return (FORM_KEYS as readonly string[]).includes(k) ? k : FORM_KEY;
};

// Formulário em que a pessoa mexe: o dela mesmo, ou uma cópia nova (se estava usando o de outra pessoa).
async function workingTemplate(
  me: { id: string; name: string; email: string }, name?: string,
): Promise<Template> {
  const active = await getActiveTemplate(me.id);
  if (active.id !== BASE_ID && active.owner_id === me.id) return structuredClone(active);
  const first = (me.name || me.email).split(" ")[0];
  const copy: Template = {
    id: newTemplateId(),
    name: name?.trim() || `${active.name} · ${first}`,
    owner_id: me.id,
    owner_name: me.name || me.email,
    parent_name: active.name,
    created_at: new Date().toISOString(),
    forms: structuredClone(active.forms),
  };
  return copy;
}

async function commit(me: { id: string }, tpl: Template) {
  const r = await saveTemplate(tpl);
  if (r.error) return false;
  await setActiveTemplate(me.id, tpl.id);
  refresh();
  return true;
}

export async function addCustomQuestion(_: string | null, form: FormData) {
  const me = await requireMember();
  const formKey = formKeyOf(form);
  const label = String(form.get("label") ?? "").trim();
  const type = String(form.get("type")) as QuestionType;
  const options = lines(String(form.get("options") ?? ""));
  const newName = String(form.get("new_name") ?? "").trim();

  const active = await getActiveTemplate(me.id);
  const forking = active.id === BASE_ID || active.owner_id !== me.id;
  if (forking && !newName) return "Dê um nome para o seu novo formulário.";
  if (!label) return "Escreva a pergunta.";
  if (!TYPES.includes(type)) return "Escolha como a pessoa responde.";
  if (NEEDS.includes(type) && options.length < 2) return "Informe pelo menos 2 opções, uma por linha.";

  const tpl = await workingTemplate(me, newName);
  const delta = tpl.forms[formKey] ?? emptyDelta();
  const key = "x_" + randomBytes(4).toString("hex");
  delta.questions.push({
    id: `custom-${key}`, form_key: formKey, key, position: 10000 + delta.questions.length,
    section: "PERGUNTAS ADICIONAIS", label, help: String(form.get("help") ?? "").trim(), type,
    options: NEEDS.includes(type) ? options : [], required: form.get("required") === "on", active: true,
  });
  tpl.forms[formKey] = delta;
  return (await commit(me, tpl)) ? "ok" : "Não foi possível salvar a pergunta.";
}

export async function deleteCustomQuestion(form: FormData) {
  const me = await requireMember();
  const formKey = formKeyOf(form);
  const key = String(form.get("key"));
  const tpl = await workingTemplate(me);
  const delta = tpl.forms[formKey] ?? emptyDelta();
  delta.questions = delta.questions.filter((q: Question) => q.key !== key);
  tpl.forms[formKey] = delta;
  await commit(me, tpl);
}

export async function saveQuestionEdit(form: FormData) {
  const me = await requireMember();
  const formKey = formKeyOf(form);
  const key = String(form.get("key"));
  const label = String(form.get("label") ?? "").trim();
  if (!key) return "Pergunta inválida.";
  if (!label) return "A pergunta não pode ficar vazia.";
  const hasOptions = form.get("has_options") === "1";
  const options = lines(String(form.get("options") ?? ""));
  if (hasOptions && options.length < 2) return "Informe pelo menos 2 opções, uma por linha.";
  const patch = {
    label, help: String(form.get("help") ?? "").trim(),
    required: form.get("required") === "on", ...(hasOptions ? { options } : {}),
  };

  const tpl = await workingTemplate(me);
  const delta = tpl.forms[formKey] ?? emptyDelta();
  if (key.startsWith("x_")) delta.questions = delta.questions.map((q) => (q.key === key ? { ...q, ...patch } : q));
  else delta.overrides = { ...delta.overrides, [key]: patch };
  tpl.forms[formKey] = delta;
  return (await commit(me, tpl)) ? "ok" : "Não foi possível salvar a pergunta.";
}

export async function resetQuestionEdit(form: FormData) {
  const me = await requireMember();
  const formKey = formKeyOf(form);
  const key = String(form.get("key"));
  const tpl = await workingTemplate(me);
  const delta = tpl.forms[formKey] ?? emptyDelta();
  const { [key]: _d, ...rest } = delta.overrides;
  delta.overrides = rest;
  tpl.forms[formKey] = delta;
  return (await commit(me, tpl)) ? "ok" : "Não foi possível restaurar.";
}

// ---- Modelos de formulários ----

export async function useTemplate(form: FormData) {
  const me = await requireMember();
  const id = String(form.get("id"));
  if (!(await findTemplate(id))) return;
  await setActiveTemplate(me.id, id);
  refresh();
  redirect("/cadastrar-pessoa");
}

export async function createTemplate(_: string | null, form: FormData) {
  const me = await requireMember();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return "Dê um nome ao novo formulário.";
  const tpl: Template = {
    id: newTemplateId(), name, owner_id: me.id, owner_name: me.name || me.email,
    parent_name: "Modelo padrão", created_at: new Date().toISOString(), forms: {},
  };
  if (!(await commit(me, tpl))) return "Não foi possível criar o formulário.";
  redirect("/cadastrar-pessoa");
}

export async function deleteTemplate(form: FormData) {
  const me = await requireMember();
  const id = String(form.get("id"));
  const active = await getActiveTemplate(me.id);
  await removeTemplate(me.id, id);
  if (active.id === id) await setActiveTemplate(me.id, BASE_ID);
  refresh();
}
