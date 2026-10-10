"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <div className="login-wrap">
      <section className="login-brand">
        <div className="mark">🛡️</div>
        <h1>Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho</h1>
        <p>Acompanhamento, registro e compartilhamento seguro das informações da equipe.</p>
      </section>
      <section className="login-form">
        <form action={action} className="card grid" style={{ gap: 14 }}>
          <div>
            <h2>Acesso da equipe</h2>
            <span style={{ color: "var(--muted)" }}>Use o e-mail liberado pelo núcleo.</span>
          </div>
          <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
          <input name="password" type="password" placeholder="Senha" autoComplete="current-password" required />
          <button disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </div>
  );
}
