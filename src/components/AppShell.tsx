"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, FileText, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm, type Professional } from "./ProfileForm";
import { AcolhimentoForm } from "./AcolhimentoForm";
import { AcompanhamentoList, type Card } from "./AcompanhamentoList";

type Props = {
  name: string; email: string; isAdmin: boolean;
  professional: Professional | null; available: Professional[]; cards: Card[];
};

export function AppShell({ name, email, isAdmin, professional, available, cards }: Props) {
  const [tab, setTab] = useState<"perfil" | "formulario">("perfil");
  const [sub, setSub] = useState<"novo" | "acompanhamento">("novo");
  const [dropped, setDropped] = useState(false);
  const headRef = useRef<HTMLElement>(null);
  const [top, setTop] = useState(110);

  // O card do perfil "cai" ao entrar e sobe quando a pessoa sai do perfil.
  useEffect(() => { const t = setTimeout(() => setDropped(true), 60); return () => clearTimeout(t); }, []);
  const open = dropped && tab === "perfil";

  useLayoutEffect(() => {
    const measure = () => headRef.current && setTop(headRef.current.getBoundingClientRect().bottom);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header ref={headRef} className="topbar">
        <div className="inner">
          <strong>Núcleo Psicossocial · VPIJ Porto Velho</strong>
          <button type="button" className="who-btn" aria-expanded={open} onClick={() => setTab("perfil")}>
            <span>{name}</span>
            <ChevronDown size={18} className="chev" style={{ transform: open ? "rotate(180deg)" : undefined }} />
          </button>
        </div>
        <nav className="tabs">
          <button type="button" className={tab === "perfil" ? "on" : ""} onClick={() => setTab("perfil")}>
            <UserRound size={17} /> Meu perfil
          </button>
          <button type="button" className={tab === "formulario" ? "on" : ""} onClick={() => setTab("formulario")}>
            <FileText size={17} /> Formulário
          </button>
        </nav>
      </header>

      <section className={`profile-sheet${open ? " open" : ""}`} style={{ top }} aria-hidden={!open}>
        <div className="profile-inner">
          <div className="card grid" style={{ gap: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Meu perfil</h2>
              <span style={{ color: "var(--muted)" }}>{email}</span>
            </div>
            <ProfileForm name={name} linked={professional} available={available} />
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            {isAdmin && (
              <Link href="/usuarios"><button type="button" className="light"><ShieldCheck size={18} /> Gerenciar usuários</button></Link>
            )}
            <form action={logout}><button className="light"><LogOut size={18} /> Sair</button></form>
          </div>
        </div>
      </section>

      <main className="container grid" style={{ gap: 16 }}>
        <div className="subtabs">
          <button type="button" className={sub === "novo" ? "on" : ""} onClick={() => setSub("novo")}>Novo acolhimento</button>
          <button type="button" className={sub === "acompanhamento" ? "on" : ""} onClick={() => setSub("acompanhamento")}>
            Acompanhamento ({cards.length})
          </button>
        </div>
        {sub === "novo" ? (
          <AcolhimentoForm
            professional={professional}
            onSaved={() => setSub("acompanhamento")}
            goProfile={() => setTab("perfil")}
          />
        ) : (
          <AcompanhamentoList cards={cards} />
        )}
      </main>
    </>
  );
}
