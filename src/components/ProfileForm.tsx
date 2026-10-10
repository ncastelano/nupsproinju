"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/(app)/actions";
import { PasswordInput } from "@/components/PasswordInput";

export type Professional = { id: string; name: string; registry: string };

export function ProfileForm({
  name, linked, available,
}: { name: string; linked: Professional | null; available: Professional[] }) {
  const [msg, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="grid" style={{ gap: 12 }}>
      <label className="field">
        <span>Nome</span>
        <input name="name" defaultValue={name} placeholder="Nome completo" required />
      </label>

      {linked ? (
        <div className="field">
          <span>Profissional do NUPS</span>
          <div className="linked">{linked.name} · {linked.registry}</div>
        </div>
      ) : (
        <label className="field">
          <span>Quem é você no NUPS?</span>
          <select name="professional_id" defaultValue="">
            <option value="">Selecione o seu nome</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.registry}</option>
            ))}
          </select>
        </label>
      )}

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
