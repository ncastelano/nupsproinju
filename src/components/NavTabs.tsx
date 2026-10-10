"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/cadastros", label: "Cadastro inicial", on: path === "/cadastros" || path.startsWith("/cadastro-inicial") || path.startsWith("/cadastrados") || path.startsWith("/documentos") },
    { href: "/acompanhamentos", label: "Acompanhamentos", on: path === "/acompanhamentos" },
    ...(isAdmin ? [{ href: "/usuarios", label: "Usuários", on: path.startsWith("/usuarios") }] : []),
  ];
  return (
    <nav className="subtabs main-nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href}>
          <button type="button" className={i.on ? "on" : ""}>{i.label}</button>
        </Link>
      ))}
    </nav>
  );
}
