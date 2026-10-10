"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";
import { FileText, Database, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/formulario", label: "Formulário", Icon: FileText },
  { href: "/banco-de-dados", label: "Banco de dados", Icon: Database },
  { href: "/perfil", label: "Meu perfil", Icon: UserRound },
];

export function Topbar({ name }: { name: string }) {
  const path = usePathname();
  return (
    <header className="topbar">
      <div className="inner">
        <Link href="/formulario" className="brand-link">
          <strong>Núcleo Psicossocial · VPIJ Porto Velho</strong>
        </Link>
        <nav className="nav">
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "active" : ""}>
              <i.Icon size={17} aria-hidden /> {i.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="row">
          <span className="who">{name}</span>
          <button>Sair</button>
        </form>
      </div>
    </header>
  );
}
