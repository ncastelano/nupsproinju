"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const done = () => revalidatePath("/usuarios");

export async function createUser(form: FormData) {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const role = form.get("role") === "admin" ? "admin" : "member";
  if (!email || password.length < 6) return;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return;
  await admin.from("members").insert({ id: data.user.id, email, name, role });
  done();
}

export async function updateUser(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id"));
  const patch: Record<string, unknown> = {
    name: String(form.get("name") ?? "").trim(),
    role: form.get("role") === "admin" ? "admin" : "member",
    active: form.get("active") === "on",
  };
  if (id === me.id) { patch.role = "admin"; patch.active = true; } // não se trancar pra fora
  const admin = createAdminClient();
  await admin.from("members").update(patch).eq("id", id);
  const password = String(form.get("password") ?? "");
  if (password.length >= 6) await admin.auth.admin.updateUserById(id, { password });
  done();
}

export async function deleteUser(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id"));
  if (id === me.id) return;
  await createAdminClient().auth.admin.deleteUser(id); // cascade apaga de members
  done();
}
