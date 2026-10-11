"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function NavTabs({ userId, isAdmin, slug }: { userId: string; isAdmin: boolean; slug: string }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  // a aba atual fica visível na rolagem
  useEffect(() => { nav.current?.querySelector<HTMLElement>("button.on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [path]);
  const items = [
    { href: `/${slug}`, label: "Meu perfil", on: path === `/${slug}` || path.startsWith("/editar-perfil") },
    { href: "/processos", label: "Relatórios", on: path.startsWith("/processos") || (path.startsWith("/cadastrados") && !path.includes("/acompanhamento")) || path.startsWith("/documentos") },
    { href: "/cadastro-inicial", label: "Cadastro inicial", on: path.startsWith("/cadastro-inicial") },
    { href: "/acompanhamento", label: "Acompanhamento", on: path.startsWith("/acompanhamento") || /^\/cadastrados\/[^/]+\/acompanhamento/.test(path) },
    { href: "/fiscalizacoes", label: "Fiscalizações", on: path.startsWith("/fiscalizacoes") },
    { href: "/bloco-de-notas", label: "Bloco de notas", on: path.startsWith("/bloco-de-notas") },
    ...(isAdmin ? [{ href: "/usuarios", label: "Usuários", on: path.startsWith("/usuarios") }] : []),
  ];
  return (
    <nav ref={nav} className="subtabs main-nav scroll-nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href}>
          <button type="button" className={i.on ? "on" : ""}>{i.label}</button>
        </Link>
      ))}
    </nav>
  );
}
