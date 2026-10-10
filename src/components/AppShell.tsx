"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm, type Professional } from "./ProfileForm";
import { AcolhimentoForm } from "./AcolhimentoForm";
import { AcompanhamentoList, type Card } from "./AcompanhamentoList";
import { Avatar } from "./Avatar";
import type { FormQuestion } from "./QuestionEditor";

type Props = {
  name: string; email: string; isAdmin: boolean; avatarUrl: string | null;
  registry: string; professional: Professional; cards: Card[]; questions: FormQuestion[];
};

export function AppShell({ name, email, isAdmin, avatarUrl, registry, professional, cards, questions }: Props) {
  const [tab, setTab] = useState<"novo" | "acompanhamento">("novo");
  const [open, setOpen] = useState(false);
  const [headH, setHeadH] = useState(72);
  const innerRef = useRef<HTMLDivElement>(null);

  // Altura real da barra fechada (a barra pode quebrar em 2 linhas no celular).
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight));
    ro.observe(el);
    setHeadH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // O header expande sozinho ao entrar na página.
  useEffect(() => { const t = setTimeout(() => setOpen(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div style={{ height: headH }} />
      <header className={`topbar${open ? " open" : ""}`} style={{ ["--head-h" as string]: `${headH}px` }}>
        <div ref={innerRef} className="inner">
          <strong className="brand">Núcleo Psicossocial · VPIJ Porto Velho</strong>
          <button type="button" className="who-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Avatar url={avatarUrl} size={30} />
            <span>{name}</span>
            <ChevronDown size={18} className="chev" />
          </button>
        </div>

        <div className="expander" aria-hidden={!open}>
          <div className="expander-inner">
            <span className="sheet-sub">{email}</span>
            <ProfileForm name={name} avatarUrl={avatarUrl} registry={registry} />
            <div className="row" style={{ justifyContent: "center" }}>
              <form action={logout}><button className="light"><LogOut size={18} /> Sair</button></form>
              <button type="button" className="light" onClick={() => setOpen(false)}><ChevronUp size={18} /> Fechar</button>
            </div>
          </div>
        </div>
      </header>

      <main className="container grid" style={{ gap: 16 }}>
        <div className="subtabs">
          <button type="button" className={tab === "novo" ? "on" : ""} onClick={() => setTab("novo")}>Novo acolhimento</button>
          <button type="button" className={tab === "acompanhamento" ? "on" : ""} onClick={() => setTab("acompanhamento")}>
            Acompanhamento ({cards.length})
          </button>
          {isAdmin && (
            <Link href="/usuarios">
              <button type="button"><ShieldCheck size={16} style={{ verticalAlign: "-3px" }} /> Gerenciar usuários</button>
            </Link>
          )}
        </div>
        {tab === "novo" ? (
          <AcolhimentoForm
            professional={professional}
            questions={questions}
            isAdmin={isAdmin}
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
