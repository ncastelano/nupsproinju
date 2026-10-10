"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY, type QuestionType } from "@/lib/forms";

const TYPES: QuestionType[] = ["text", "textarea", "date", "select", "radio", "radio_other"];
const done = () => { revalidatePath("/formulario"); revalidatePath("/formulario/editar"); };
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function fields(form: FormData) {
  const type = String(form.get("type")) as QuestionType;
  return {
    label: String(form.get("label") ?? "").trim(),
    help: String(form.get("help") ?? "").trim(),
    section: String(form.get("section") ?? "").trim(),
    type: TYPES.includes(type) ? type : "text",
    options: lines(String(form.get("options") ?? "")),
    required: form.get("required") === "on",
    active: form.get("active") === "on",
  };
}

export async function updateQuestion(form: FormData) {
  await requireAdmin();
  const f = fields(form);
  if (!f.label) return;
  await createAdminClient().from("form_questions").update(f).eq("id", String(form.get("id")));
  done();
}

export async function addQuestion(form: FormData) {
  await requireAdmin();
  const { active: _a, ...f } = fields(form);
  if (!f.label) return;
  const admin = createAdminClient();
  const { data } = await admin.from("form_questions").select("position").eq("form_key", FORM_KEY)
    .order("position", { ascending: false }).limit(1);
  const position = ((data?.[0]?.position as number | undefined) ?? 0) + 10;
  await admin.from("form_questions").insert({
    ...f, form_key: FORM_KEY, key: "q_" + randomBytes(4).toString("hex"), position,
  });
  done();
}

export async function moveQuestion(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const admin = createAdminClient();
  const { data } = await admin.from("form_questions").select("id, position")
    .eq("form_key", FORM_KEY).order("position");
  const list = data ?? [];
  const i = list.findIndex((q) => q.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  // renumera tudo em passos de 10, trocando i e j
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((q, n) => admin.from("form_questions").update({ position: (n + 1) * 10 }).eq("id", q.id)));
  done();
}

export async function deleteQuestion(form: FormData) {
  await requireAdmin();
  // apaga a pergunta; os cadastros já salvos mantêm o texto da época
  await createAdminClient().from("form_questions").delete().eq("id", String(form.get("id")));
  done();
}
