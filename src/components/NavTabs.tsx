"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserPlus } from "lucide-react";

export function NavTabs({ userId, isAdmin, slug, pending = 0 }: { userId: string; isAdmin: boolean; slug: string; pending?: number }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);
  const [n, setN] = useState(pending);
  const last = useRef(pending);

  // a aba atual fica visível na rolagem
  useEffect(() => { nav.current?.querySelector<HTMLElement>("button.on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [path]);

  // número do servidor (muda ao aprovar/recusar)
  useEffect(() => { setN(pending); last.current = pending; }, [pending]);

  // administradores: confere de tempos em tempos se chegou uma nova solicitação de acesso
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    const check = async () => {
      try {
        const r = await fetch("/usuarios/pendentes", { cache: "no-store" });
        if (!r.ok || !live) return;
        const { n: now } = (await r.json()) as { n: number };
        last.current = now;
        setN(now);
      } catch { /* sem rede: tenta de novo depois */ }
    };
    const t = setInterval(check, 30000);
    const onVis = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { live = false; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [isAdmin]);

  const items = [
    { href: `/${slug}`, label: "Meu perfil", on: path === `/${slug}` || path.startsWith("/editar-perfil") },
    { href: "/processos", label: "Relatórios", on: path.startsWith("/processos") || (path.startsWith("/cadastrados") && !path.includes("/acompanhamento")) || path.startsWith("/documentos") },
    { href: "/cadastro-inicial", label: "Cadastro inicial", on: path.startsWith("/cadastro-inicial") },
    { href: "/acompanhamento", label: "Acompanhamento", on: path.startsWith("/acompanhamento") || /^\/cadastrados\/[^/]+\/acompanhamento/.test(path) },
    { href: "/fiscalizacoes", label: "Fiscalizações", on: path.startsWith("/fiscalizacoes") },
    { href: "/bloco-de-notas", label: "Bloco de notas", on: path.startsWith("/bloco-de-notas") },
    ...(isAdmin ? [{ href: "/usuarios", label: "Usuários", on: path.startsWith("/usuarios"), badge: n }] : []),
  ] as { href: string; label: string; on: boolean; badge?: number }[];

  return (
    <header className="app-header">
      <div className="inner">
        <Link href="/" className="app-brand" title="Núcleo Psicossocial · PROINJU — ir para o início">PROINJU</Link>
        <nav ref={nav} className="subtabs main-nav scroll-nav" aria-label="Menu principal">
          {items.map((i) => (
            <Link key={i.href} href={i.href}>
              <button type="button" className={i.on ? "on" : ""}>
                {i.label}
                {!!i.badge && i.badge > 0 && <span className="tab-badge" aria-label={`${i.badge} pedidos de acesso aguardando`}>{i.badge}</span>}
              </button>
            </Link>
          ))}
        </nav>
      </div>
      {/* o aviso fica enquanto houver pedidos aguardando (some só na própria página de Usuários) */}
      {isAdmin && n > 0 && !path.startsWith("/usuarios") && (
        <div className="toast-access" role="status">
          <UserPlus size={16} />
          <span>{n === 1 ? "1 solicitação de acesso aguardando aprovação." : `${n} solicitações de acesso aguardando aprovação.`}</span>
          <Link href="/usuarios">Ver</Link>
        </div>
      )}
    </header>
  );
}
