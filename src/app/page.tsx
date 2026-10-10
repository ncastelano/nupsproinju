import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { logout } from "./login/actions";

export default async function Home() {
  const m = await requireMember();
  return (
    <>
      <h1>NUPS Pro Injur</h1>
      <p>Olá, {m.name || m.email} ({m.role === "admin" ? "administrador" : "membro"}).</p>
      <p>As próximas páginas entram aqui conforme formos construindo.</p>
      {m.role === "admin" && <p><Link href="/usuarios">Gerenciar usuários</Link></p>}
      <form action={logout}><button>Sair</button></form>
    </>
  );
}
