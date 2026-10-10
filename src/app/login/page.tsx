"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <div className="login-wrap">
      <Brand />
      <section className="login-form">
        <form action={action} className="card grid" style={{ gap: 14 }}>
          <div>
            <h2>Entrar</h2>
            <span style={{ color: "var(--muted)" }}>Acesse com o seu e-mail e senha.</span>
          </div>
          <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
          <input name="password" type="password" placeholder="Senha" autoComplete="current-password" required />
          <button disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
          {error && <p className="error">{error}</p>}
          <div style={{ textAlign: "center" }}>
            Ainda não tem conta? <Link href="/cadastro">Solicitar acesso</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
