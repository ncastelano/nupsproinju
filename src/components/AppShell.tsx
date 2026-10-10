"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm, type Professional } from "./ProfileForm";
import { AcolhimentoForm } from "./AcolhimentoForm";
import { AcompanhamentoList, type Card } from "./AcompanhamentoList";

type Props = {
  name: string; email: string; isAdmin: boolean;
  professional: Professional | null; available: Professional[]; cards: Card[];
};

export function AppShell({ name, email, isAdmin, professional, available, cards }: Props) {
  const [tab, setTab] = useState<"perfil" | "novo" | "acompanhamento">("perfil");
  const [dropped, setDropped] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(110);

  // O card do perfil "cai" ao entrar e sobe quando a pessoa sai do perfil.
  useEffect(() => { const t = setTimeout(() => setDropped(true), 60); return () => clearTimeout(t); }, []);
  const open = dropped && tab === "perfil";

  // O painel começa logo abaixo da linha de abas, que fica sempre visível.
  useLayoutEffect(() => {
    const measure = () => rowRef.current && setTop(rowRef.current.getBoundingClientRect().bottom);
    if (tab === "perfil") window.scrollTo(0, 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="topbar">
        <div className="inner">
          <strong>Núcleo Psicossocial · VPIJ Porto Velho</strong>
          <button type="button" className="who-btn" aria-expanded={open} onClick={() => setTab("perfil")}>
            <span>{name}</span>
            <ChevronDown size={18} className="chev" style={{ transform: open ? "rotate(180deg)" : undefined }} />
          </button>
        </div>
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
        <div ref={rowRef} className="subtabs">
          <button type="button" className={tab === "perfil" ? "on" : ""} onClick={() => setTab("perfil")}>Meu perfil</button>
          <button type="button" className={tab === "novo" ? "on" : ""} onClick={() => setTab("novo")}>Novo acolhimento</button>
          <button type="button" className={tab === "acompanhamento" ? "on" : ""} onClick={() => setTab("acompanhamento")}>
            Acompanhamento ({cards.length})
          </button>
        </div>
        {tab !== "acompanhamento" ? (
          <AcolhimentoForm
            professional={professional}
            onSaved={() => setTab("acompanhamento")}
            goProfile={() => setTab("perfil")}
          />
        ) : (
          <AcompanhamentoList cards={cards} />
        )}
      </main>
    </>
  );
}
