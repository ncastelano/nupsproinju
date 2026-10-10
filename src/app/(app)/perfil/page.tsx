import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export default async function PerfilPage() {
  const m = await requireMember();
  return (
    <div className="grid" style={{ gap: 16, maxWidth: 560 }}>
      <h1 style={{ margin: "8px 0 0" }}>Meu perfil</h1>
      <dl className="card kv">
        <dt>Nome</dt><dd>{m.name || "—"}</dd>
        <dt>E-mail</dt><dd>{m.email}</dd>
        <dt>Função</dt><dd>{m.role === "admin" ? "Administrador" : "Membro"}</dd>
      </dl>
      <ProfileForm name={m.name} />
      {m.role === "admin" && (
        <Link href="/usuarios"><button className="ghost">Gerenciar usuários</button></Link>
      )}
    </div>
  );
}
