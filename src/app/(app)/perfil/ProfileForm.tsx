"use client";
import { useActionState } from "react";
import { updateProfile } from "./actions";
import { PasswordInput } from "@/components/PasswordInput";

export function ProfileForm({ name }: { name: string }) {
  const [msg, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="card grid" style={{ gap: 12 }}>
      <strong>Editar dados</strong>
      <input name="name" defaultValue={name} placeholder="Nome completo" required />
      <PasswordInput name="password" placeholder="Nova senha (deixe em branco para manter)" minLength={6} autoComplete="new-password" />
      <button disabled={pending}>{pending ? "Salvando..." : "Salvar"}</button>
      {msg === "ok" && <p className="ok">Dados atualizados.</p>}
      {msg && msg !== "ok" && <p className="error">{msg}</p>}
    </form>
  );
}
