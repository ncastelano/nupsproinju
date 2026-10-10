import Link from "next/link";
import { logout } from "@/app/login/actions";

export function Topbar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  return (
    <header className="topbar">
      <div className="inner">
        <Link href="/"><strong>Núcleo Psicossocial · VPIJ Porto Velho</strong></Link>
        <div className="row">
          {isAdmin && <Link href="/usuarios">Usuários</Link>}
          <span style={{ opacity: .85 }}>{name}</span>
          <form action={logout}><button>Sair</button></form>
        </div>
      </div>
    </header>
  );
}
