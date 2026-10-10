"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm, type Professional } from "./ProfileForm";
import { AcolhimentoForm } from "./AcolhimentoForm";
import { AcompanhamentoList, type Card } from "./AcompanhamentoList";

type Props = {
  name: string; email: string; isAdmin: boolean;
  professional: Professional | null; available: Professional[]; cards: Card[];
};

export function AppShell({ name, email, isAdmin, professional, available, cards }: Props) {
  const [tab, setTab] = useState<"novo" | "acompanhamento">("novo");
  const [open, setOpen] = useState(false);

  // O perfil "cai" ao entrar na página.
  useEffect(() => { const t = setTimeout(() => setOpen(true), 60); return () => clearTimeout(t); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="topbar">
        <div className="inner">
          <strong>Núcleo Psicossocial · VPIJ Porto Velho</strong>
          <button type="button" className="who-btn" aria-expanded={open} onClick={() => setOpen(true)}>
            <span>{name}</span>
            <ChevronDown size={18} className="chev" />
          </button>
        </div>
      </header>

      <section className={`profile-sheet${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="profile-inner">
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0 }}>{name}</h2>
              <span className="sheet-sub">{email}</span>
            </div>
            <button type="button" className="light" onClick={() => setOpen(false)}>
              <ChevronUp size={18} /> Fechar
            </button>
          </div>

          <ProfileForm name={name} linked={professional} available={available} />

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
          <button type="button" className={tab === "novo" ? "on" : ""} onClick={() => setTab("novo")}>Novo acolhimento</button>
          <button type="button" className={tab === "acompanhamento" ? "on" : ""} onClick={() => setTab("acompanhamento")}>
            Acompanhamento ({cards.length})
          </button>
        </div>
        {tab === "novo" ? (
          <AcolhimentoForm
            professional={professional}
            onSaved={() => setTab("acompanhamento")}
            goProfile={() => setOpen(true)}
          />
        ) : (
          <AcompanhamentoList cards={cards} />
        )}
      </main>
    </>
  );
}
