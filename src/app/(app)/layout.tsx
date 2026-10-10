import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function sair() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfis").select("nome,papel,ativo").eq("id", user.id).single();
  if (!perfil?.ativo) {
    await supabase.auth.signOut();
    redirect("/login?erro=1");
  }
  return (
    <>
      <nav>
        <strong>Núcleo Psicossocial</strong>
        <Link href="/documentos">Documentos</Link>
        {perfil.papel === "admin" && <Link href="/usuarios">Usuários</Link>}
        <form action={sair} className="sair">
          <span>{perfil.nome} </span>
          <button type="submit">Sair</button>
        </form>
      </nav>
      <main>{children}</main>
    </>
  );
}
