import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";

export default async function Home() {
  const m = await requireMember();
  return (
    <>
      <Topbar name={m.name || m.email} isAdmin={m.role === "admin"} />
      <div className="container grid" style={{ gap: 16 }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Olá, {m.name || m.email} 👋</h1>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            Bem-vindo(a) ao sistema do Núcleo Psicossocial da Vara de Proteção à Infância e Juventude
            de Porto Velho. As próximas páginas entram aqui conforme formos construindo.
          </p>
        </div>
        {m.role === "admin" && (
          <div className="card row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>Usuários</strong>
              <div style={{ color: "var(--muted)" }}>Quem pode entrar e o que cada pessoa pode fazer.</div>
            </div>
            <Link href="/usuarios"><button className="ghost">Gerenciar</button></Link>
          </div>
        )}
      </div>
    </>
  );
}
