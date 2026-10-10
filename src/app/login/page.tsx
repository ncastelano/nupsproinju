"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} style={{ display: "grid", gap: 12, maxWidth: 320, margin: "80px auto" }}>
      <h1>Entrar</h1>
      <input name="email" type="email" placeholder="E-mail" required />
      <input name="password" type="password" placeholder="Senha" required />
      <button disabled={pending}>{pending ? "Entrando..." : "Entrar"}</button>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
    </form>
  );
}
