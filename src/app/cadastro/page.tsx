"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../login/actions";
import { Brand } from "@/components/Brand";

export default function CadastroPage() {
  const [error, action, pending] = useActionState(signup, null);
  return (
    <div className="login-wrap">
      <Brand />
      <section className="login-form">
        <form action={action} className="card grid" style={{ gap: 14 }}>
          <div>
            <h2>Solicitar acesso</h2>
            <span style={{ color: "var(--muted)" }}>
              Seu pedido será analisado pelo administrador antes da liberação.
            </span>
          </div>
          <input name="name" placeholder="Nome completo" autoComplete="name" required />
          <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
          <input name="password" type="password" placeholder="Senha (mín. 6 caracteres)" minLength={6} autoComplete="new-password" required />
          <button disabled={pending}>{pending ? "Enviando..." : "Pedir acesso"}</button>
          {error && <p className="error">{error}</p>}
          <div style={{ textAlign: "center" }}>
            Já tem conta? <Link href="/login">Entrar</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
