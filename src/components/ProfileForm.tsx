"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/(app)/actions";
import { PasswordInput } from "@/components/PasswordInput";

export function ProfileForm({ name }: { name: string }) {
  const [msg, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="grid" style={{ gap: 12 }}>
      <label className="field">
        <span>Nome</span>
        <input name="name" defaultValue={name} placeholder="Nome completo" required />
      </label>
      <label className="field">
        <span>Nova senha</span>
        <PasswordInput name="password" placeholder="Deixe em branco para manter" minLength={6} autoComplete="new-password" />
      </label>
      <button disabled={pending}>{pending ? "Salvando..." : "Salvar alterações"}</button>
      {msg === "ok" && <p className="ok">Dados atualizados.</p>}
      {msg && msg !== "ok" && <p className="error">{msg}</p>}
    </form>
  );
}
