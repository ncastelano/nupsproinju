import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function entrar(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("senha")),
  });
  if (error) redirect("/login?erro=1");
  redirect("/documentos");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main style={{ maxWidth: 420, marginTop: 48 }}>
      <div className="card">
        <h1 style={{ fontSize: 20, lineHeight: 1.3 }}>
          Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho
        </h1>
        <form action={entrar}>
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required style={{ width: "100%" }} />
          <label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" required style={{ width: "100%" }} />
          {erro && <p className="erro">E-mail ou senha inválidos, ou acesso desativado.</p>}
          <p><button type="submit">Entrar</button></p>
        </form>
      </div>
    </main>
  );
}
