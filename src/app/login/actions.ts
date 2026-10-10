"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function login(_: string | null, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return "E-mail ou senha incorretos.";
  redirect("/modelos-de-formularios"); // aprovado entra; pendente/recusado cai em /acesso pela própria checagem
}

export async function signup(_: string | null, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email) return "Preencha nome e e-mail.";
  if (password.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";

  const registry = String(form.get("registry") ?? "").trim();
  if (!registry) return "Informe o seu CRP ou CRESS.";

  // Cria já confirmado (sem e-mail de verificação); a barreira é a aprovação do administrador.
  const { error } = await createAdminClient().auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (error) {
    return /already|registered|exists/i.test(error.message)
      ? "Este e-mail já tem cadastro. Use a tela de entrar."
      : "Não foi possível criar o cadastro. Tente novamente.";
  }
  // o trigger já criou a linha em members; aqui gravamos o registro profissional
  await createAdminClient().from("members").update({ registry }).eq("email", email);
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/modelos-de-formularios");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
