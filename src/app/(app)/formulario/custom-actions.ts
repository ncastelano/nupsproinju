"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEYS, FORM_KEY, type Question, type QuestionType } from "@/lib/forms";
import { getCustomForms } from "@/lib/questions";

const TYPES: QuestionType[] = ["text", "textarea", "date", "select", "radio", "radio_other", "checkbox"];
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

async function save(userId: string, forms: Record<string, unknown>) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...(data.user?.user_metadata ?? {}), custom_forms: forms },
  });
}

export async function addCustomQuestion(_: string | null, form: FormData) {
  const me = await requireMember();
  const k = String(form.get("form_key"));
  const formKey = (FORM_KEYS as readonly string[]).includes(k) ? k : FORM_KEY;
  const typeName = String(form.get("type_name") ?? "").trim();
  const label = String(form.get("label") ?? "").trim();
  const type = String(form.get("type")) as QuestionType;
  const options = lines(String(form.get("options") ?? ""));

  if (!typeName) return "Dê um nome para este formulário.";
  if (!label) return "Escreva a pergunta.";
  if (!TYPES.includes(type)) return "Escolha o tipo de resposta.";
  if (["select", "radio", "radio_other", "checkbox"].includes(type) && options.length < 2) {
    return "Informe pelo menos 2 opções, uma por linha.";
  }

  const forms = await getCustomForms(me.id);
  const cur = forms[formKey] ?? { name: typeName, questions: [] };
  const key = "x_" + randomBytes(4).toString("hex");
  const q: Question = {
    id: `custom-${key}`, form_key: formKey, key,
    position: 10000 + cur.questions.length,
    section: "PERGUNTAS ADICIONAIS",
    label, help: String(form.get("help") ?? "").trim(), type,
    options: ["select", "radio", "radio_other", "checkbox"].includes(type) ? options : [],
    required: form.get("required") === "on", active: true,
  };
  forms[formKey] = { name: typeName, questions: [...cur.questions, q] };
  const { error } = await save(me.id, forms);
  if (error) return "Não foi possível salvar a pergunta.";
  revalidatePath("/formulario");
  revalidatePath("/usuarios", "layout");
  return "ok";
}

export async function deleteCustomQuestion(form: FormData) {
  const me = await requireMember();
  const formKey = String(form.get("form_key"));
  const key = String(form.get("key"));
  const forms = await getCustomForms(me.id);
  if (!forms[formKey]) return;
  forms[formKey] = { ...forms[formKey], questions: forms[formKey].questions.filter((q) => q.key !== key) };
  if (forms[formKey].questions.length === 0) delete forms[formKey];
  await save(me.id, forms);
  revalidatePath("/formulario");
  revalidatePath("/usuarios", "layout");
}
