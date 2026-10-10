"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const ITEMS = [
  { href: "/formulario", label: "Formulário", icon: "📝" },
  { href: "/banco-de-dados", label: "Banco de dados", icon: "🗂️" },
  { href: "/perfil", label: "Meu perfil", icon: "👤" },
];

export function Topbar({ name }: { name: string }) {
  const path = usePathname();
  return (
    <header className="topbar">
      <div className="inner">
        <Link href="/" className="brand-link">
          <strong>Núcleo Psicossocial · VPIJ Porto Velho</strong>
        </Link>
        <nav className="nav">
          {ITEMS.map((i) => (
            <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "active" : ""}>
              <span aria-hidden>{i.icon}</span> {i.label}
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
