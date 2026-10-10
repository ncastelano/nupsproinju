"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEYS, FORM_KEY, type QuestionType } from "@/lib/forms";

const TYPES: QuestionType[] = ["text", "textarea", "date", "select", "radio", "radio_other", "checkbox"];
const formKeyOf = (f: FormData) => {
  const k = String(f.get("form_key"));
  return (FORM_KEYS as readonly string[]).includes(k) ? k : FORM_KEY;
};
const done = () => { revalidatePath("/formulario"); revalidatePath("/formulario/editar"); revalidatePath("/usuarios", "layout"); };
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

// Edita a cópia da própria pessoa; só o admin edita o modelo (modelo=1).
// Na primeira alteração, o modelo é copiado pra pessoa ("Cadastro de <nome>").
async function scope(form: FormData) {
  const me = await requireMember();
  const formKey = formKeyOf(form);
  const admin = createAdminClient();
  if (form.get("modelo") === "1") {
    if (me.role !== "admin") throw new Error("Somente o administrador edita o modelo.");
    return { admin, formKey, owner: null as string | null };
  }
  const { count } = await admin.from("form_questions").select("id", { count: "exact", head: true })
    .eq("form_key", formKey).eq("owner_id", me.id);
  if (!count) {
    const { data: model } = await admin.from("form_questions").select("*")
      .eq("form_key", formKey).is("owner_id", null);
    if (model?.length) {
      await admin.from("form_questions").insert(
        model.map(({ id: _id, created_at: _c, ...q }) => ({ ...q, owner_id: me.id })),
      );
    }
  }
  return { admin, formKey, owner: me.id as string | null };
}

// filtra pelas perguntas do dono (ou pelo modelo, quando owner é nulo)
function mine<T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(q: T, owner: string | null): T {
  return owner ? q.eq("owner_id", owner) : q.is("owner_id", null);
}

type Owned = { id: string; key: string; position: number };
async function listOwned(admin: ReturnType<typeof createAdminClient>, formKey: string, owner: string | null): Promise<Owned[]> {
  const base = admin.from("form_questions").select("id, key, position").eq("form_key", formKey);
  const { data } = owner ? await base.eq("owner_id", owner).order("position") : await base.is("owner_id", null).order("position");
  return (data ?? []) as Owned[];
}

export async function updateQuestion(form: FormData) {
  const { admin, formKey, owner } = await scope(form);
  const f = fields(form);
  if (!f.label) return;
  await mine(admin.from("form_questions").update(f).eq("form_key", formKey).eq("key", String(form.get("key"))), owner);
  done();
}

export async function addQuestion(form: FormData) {
  const { admin, formKey, owner } = await scope(form);
  const { active: _a, ...f } = fields(form);
  if (!f.label) return;
  const rows = await listOwned(admin, formKey, owner);
  const position = (rows.length ? rows[rows.length - 1].position : 0) + 10;
  await admin.from("form_questions").insert({
    ...f, form_key: formKey, key: "q_" + randomBytes(4).toString("hex"), position, owner_id: owner,
  });
  done();
}

export async function moveQuestion(form: FormData) {
  const { admin, formKey, owner } = await scope(form);
  const key = String(form.get("key"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const list = await listOwned(admin, formKey, owner);
  const i = list.findIndex((q) => q.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((q, n) => admin.from("form_questions").update({ position: (n + 1) * 10 }).eq("id", q.id)));
  done();
}

export async function deleteQuestion(form: FormData) {
  const { admin, formKey, owner } = await scope(form);
  // apaga a pergunta; os cadastros já salvos mantêm o texto da época
  await mine(admin.from("form_questions").delete().eq("form_key", formKey).eq("key", String(form.get("key"))), owner);
  done();
}
