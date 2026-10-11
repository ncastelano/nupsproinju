"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavTabs({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/processos", label: "Processos", on: path === "/processos" || (path.startsWith("/cadastrados") && !path.includes("/acompanhamento")) || path.startsWith("/documentos") },
    { href: "/cadastro-inicial", label: "Cadastro inicial", on: path.startsWith("/cadastro-inicial") },
    { href: "/acompanhamento", label: "Acompanhamento", on: path.startsWith("/acompanhamento") || /^\/cadastrados\/[^/]+\/acompanhamento/.test(path) },
    { href: "/fiscalizacoes", label: "Fiscalizações", on: path.startsWith("/fiscalizacoes") },
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
