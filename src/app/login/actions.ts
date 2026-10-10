"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(_: string | null, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return "E-mail ou senha incorretos.";
  const { data: { user } } = await supabase.auth.getUser();
  const { data: m } = await supabase.from("members").select("active").eq("id", user!.id).maybeSingle();
  if (!m?.active) {
    await supabase.auth.signOut();
    return "Este e-mail não tem acesso liberado.";
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
