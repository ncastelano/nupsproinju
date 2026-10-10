"use server";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateProfile(_: string | null, form: FormData) {
  const me = await requireMember();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name) return "Informe o seu nome.";
  if (password && password.length < 6) return "A nova senha precisa ter pelo menos 6 caracteres.";
  const admin = createAdminClient();
  await admin.from("members").update({ name }).eq("id", me.id);
  if (password) await admin.auth.admin.updateUserById(me.id, { password });
  revalidatePath("/", "layout");
  return "ok";
}
