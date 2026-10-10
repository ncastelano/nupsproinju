"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/login/actions";
import { ProfileForm } from "@/components/ProfileForm";

type Props = { name: string; email: string; isAdmin: boolean };

export function Topbar({ name, email, isAdmin }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className={`topbar${open ? " open" : ""}`}>
        <div className="inner">
          <Link href="/" onClick={() => setOpen(false)}>
            <strong>Núcleo Psicossocial · VPIJ Porto Velho</strong>
          </Link>
          <button
            type="button"
            className="who-btn"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span>{name}</span>
            <ChevronDown size={18} className="chev" />
          </button>
        </div>
      </header>

      <section className={`profile-sheet${open ? " open" : ""}`} aria-hidden={!open}>
        <div className="profile-inner">
          <div className="card grid" style={{ gap: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Meu perfil</h2>
              <span style={{ color: "var(--muted)" }}>{email}</span>
            </div>
            <ProfileForm name={name} />
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            {isAdmin && (
              <Link href="/usuarios" onClick={() => setOpen(false)}>
                <button type="button" className="light"><ShieldCheck size={18} /> Gerenciar usuários</button>
              </Link>
            )}
            <form action={logout}>
              <button className="light"><LogOut size={18} /> Sair</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
