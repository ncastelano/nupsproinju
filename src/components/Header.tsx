"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm } from "./ProfileForm";
import { Avatar } from "./Avatar";

export type MyRecord = { id: string; nome: string; processo: string };
type Props = {
  userId: string; name: string; email: string; avatarUrl: string | null;
  registry: string; records: MyRecord[];
};

// Header fixo que se expande (como um bloco só) até quase cobrir a tela.
export function Header({ userId, name, email, avatarUrl, registry, records }: Props) {
  const [open, setOpen] = useState(false);
  const [headH, setHeadH] = useState(72);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight));
    ro.observe(el);
    setHeadH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Ao entrar, o perfil já abre sozinho (e fica aberto até a pessoa informar o registro).
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

            <div className="grid" style={{ gap: 8 }}>
              <span className="sheet-sub">Meus cadastros ({records.length})</span>
              {records.length === 0 && <span className="sheet-sub">Nenhum cadastro ainda.</span>}
              {records.slice(0, 5).map((r) => (
                <Link key={r.id} href={`/banco-de-dados/${r.id}`} className="mini-rec" onClick={() => setOpen(false)}>
                  <FolderOpen size={16} />
                  <span><strong>{r.nome}</strong>{r.processo ? ` · Proc. ${r.processo}` : ""}</span>
                </Link>
              ))}
              <Link href={`/usuarios/${userId}`} onClick={() => setOpen(false)}>
                <button type="button" className="light">Ver todos os meus cadastros</button>
              </Link>
            </div>

            <div className="row" style={{ justifyContent: "center" }}>
              <form action={logout}><button className="light"><LogOut size={18} /> Sair</button></form>
              <button type="button" className="light" onClick={() => setOpen(false)}><ChevronUp size={18} /> Fechar</button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
