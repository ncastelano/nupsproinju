import Link from "next/link";
import { FolderOpen, ShieldCheck } from "lucide-react";
import { requireMember } from "@/lib/auth";

// Início: o perfil fica aberto no topo (header) e daqui a pessoa sobe para as páginas.
export default async function Home() {
  const me = await requireMember();
  return (
    <div className="cards" style={{ marginTop: 8 }}>
      <Link href={`/usuarios/${me.id}`} className="tile">
        <div className="ico"><FolderOpen size={26} /></div>
        <h3>Meus formulários</h3>
        <p>Seus formulários e acompanhamentos.</p>
      </Link>
      {me.role === "admin" && (
        <Link href="/usuarios" className="tile">
          <div className="ico"><ShieldCheck size={26} /></div>
          <h3>Usuários</h3>
          <p>Aprovar pedidos e gerenciar quem tem acesso.</p>
        </Link>
      )}
    </div>
  );
}
