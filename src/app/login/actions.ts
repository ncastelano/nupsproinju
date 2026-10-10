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
  redirect("/"); // a página inicial decide: aprovado entra, pendente/recusado vai pra /acesso
}

export async function signup(_: string | null, form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email) return "Preencha nome e e-mail.";
  if (password.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";

  const professionalId = String(form.get("professional_id") ?? "");
  const link = professionalId && professionalId !== "outro" ? professionalId : null;
  if (link) {
    const { data: taken } = await createAdminClient()
      .from("members").select("id").eq("professional_id", link).maybeSingle();
    if (taken) return "Esse profissional já tem uma conta. Fale com o administrador.";
  }

  // Cria já confirmado (sem e-mail de verificação); a barreira é a aprovação do administrador.
  const { error } = await createAdminClient().auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (error) {
    return /already|registered|exists/i.test(error.message)
      ? "Este e-mail já tem cadastro. Use a tela de entrar."
      : "Não foi possível criar o cadastro. Tente novamente.";
  }
  if (link) {
    // o trigger já criou a linha em members; aqui só ligamos ao profissional do NUPS
    await createAdminClient().from("members").update({ professional_id: link }).eq("email", email);
  }
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
