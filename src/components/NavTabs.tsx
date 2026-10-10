"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/modelos-de-formularios", label: "Modelos de formulários", on: path.startsWith("/modelos-de-formularios") },
    { href: `/usuarios/${userId}`, label: "Meus formulários", on: path === `/usuarios/${userId}` || path.startsWith("/cadastrados") || path.startsWith("/formulario") },
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
