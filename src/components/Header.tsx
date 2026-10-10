"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm } from "./ProfileForm";
import { Avatar } from "./Avatar";

type Props = {
  userId: string; name: string; email: string; avatarUrl: string | null;
  registry: string; profileslug: string;
};

// O início ("/") é o perfil aberto. Ao ir para uma página, o bloco do perfil sobe
// (e a página nova sobe junto, empurrada); ao tocar no nome, o perfil desce de novo.
export function Header({ userId, name, email, avatarUrl, registry, profileslug }: Props) {
  const path = usePathname();
  const router = useRouter();
  const isHome = path === "/";
  const [open, setOpen] = useState(false);

  // pequeno atraso para o perfil "cair" ao entrar
  useEffect(() => {
    const t = setTimeout(() => setOpen(isHome), 60);
    return () => clearTimeout(t);
  }, [isHome]);

  const toForms = () => router.push(`/usuarios/${userId}`);

  return (
    <header className={`topbar${open ? " open" : ""}`}>
      <div className="inner">
        <strong className="brand">Núcleo Psicossocial · VPIJ Porto Velho</strong>
        <button
          type="button"
          className="who-btn"
          aria-expanded={open}
          onClick={() => (isHome ? toForms() : router.push("/"))}
        >
          <Avatar url={avatarUrl} size={30} />
          <span>{name}</span>
          <ChevronDown size={18} className="chev" />
        </button>
      </div>

      <div className="expander" aria-hidden={!open} {...(!open ? { inert: true } : {})}>
        <div className="expander-clip">
          <div className="expander-inner">
            <span className="sheet-sub">{email}</span>
            <ProfileForm name={name} avatarUrl={avatarUrl} registry={registry} profileslug={profileslug} />
            <div className="row" style={{ justifyContent: "center" }}>
              <form action={logout}><button className="light"><LogOut size={18} /> Sair</button></form>
              <button type="button" className="light" onClick={toForms}><ChevronUp size={18} /> Fechar</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
