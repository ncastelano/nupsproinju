"use client";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createTemplate } from "@/app/(app)/formulario/custom-actions";

export function CreateTemplate() {
  const [msg, action, pending] = useActionState(createTemplate, null);
  return (
    <form action={action} className="card grid" style={{ gap: 10 }}>
      <strong>Criar um formulário novo</strong>
      <span style={{ color: "var(--muted)" }}>
        Começa com as perguntas do modelo padrão. Depois você adiciona as suas.
      </span>
      <div className="row">
        <input name="name" placeholder="Nome do formulário (ex.: Acolhimento de adolescentes)" required />
        <button disabled={pending}><Plus size={16} /> {pending ? "Criando..." : "Criar e usar"}</button>
      </div>
      {msg && <p className="error">{msg}</p>}
    </form>
  );
}
