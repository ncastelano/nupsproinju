"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/formulario", label: "Novo cadastro", on: path.startsWith("/formulario") },
    { href: "/cadastrados", label: "Cadastrados", on: path.startsWith("/cadastrados") },
    { href: "/banco-de-dados", label: "Banco de dados", on: path.startsWith("/banco-de-dados") },
    { href: `/usuarios/${userId}`, label: "Meus cadastros", on: path === `/usuarios/${userId}` },
    ...(isAdmin ? [{ href: "/usuarios", label: "Usuários", on: path === "/usuarios" }] : []),
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
