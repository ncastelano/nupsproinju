"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Barra fina (verde claro) logo embaixo do menu enquanto uma página carrega.
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<"idle" | "run" | "done">("idle");
  const timers = useRef<number[]>([]);

  const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };

  // começa ao clicar em um link interno
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === window.location.pathname + window.location.search) return;
      clear();
      setPhase("run");
      // segurança: some sozinha se algo travar
      timers.current.push(window.setTimeout(() => setPhase("idle"), 15000));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // termina quando o endereço muda (página chegou)
  useEffect(() => {
    setPhase((p) => {
      if (p !== "run") return p;
      clear();
      timers.current.push(window.setTimeout(() => setPhase("idle"), 450));
      return "done";
    });
  }, [path, search]);

  useEffect(() => clear, []);

  // a barra fica colada na borda de baixo do menu (ele pode mudar de altura: aviso de solicitações, tela pequena...)
  useEffect(() => {
    const place = () => {
      const h = document.querySelector<HTMLElement>(".app-header");
      const b = h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0;
      document.documentElement.style.setProperty("--nav-bottom", `${b}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [phase, path]);

  return <div className={`nav-progress ${phase}`} role="progressbar" aria-hidden={phase === "idle"} />;
}
