import Link from "next/link";
import { requireAdmin, type Member } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createUser, updateUser, deleteUser } from "./actions";

export default async function UsuariosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("*").order("email");
  const members = (data ?? []) as Member[];

  return (
    <>
      <p><Link href="/">← Início</Link></p>
      <h1>Usuários</h1>

      <h2>Adicionar</h2>
      <form action={createUser} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input name="name" placeholder="Nome" />
        <input name="email" type="email" placeholder="E-mail" required />
        <input name="password" type="text" placeholder="Senha (mín. 6)" minLength={6} required />
        <select name="role"><option value="member">Membro</option><option value="admin">Admin</option></select>
        <button>Criar</button>
      </form>

      <h2>Permitidos ({members.length})</h2>
      {members.map((m) => (
        <div key={m.id} style={{ background: "#fff", padding: 12, marginBottom: 8, borderRadius: 8 }}>
          <strong>{m.email}</strong>
          <form action={updateUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <input type="hidden" name="id" value={m.id} />
            <input name="name" defaultValue={m.name} placeholder="Nome" />
            <select name="role" defaultValue={m.role}><option value="member">Membro</option><option value="admin">Admin</option></select>
            <label><input type="checkbox" name="active" defaultChecked={m.active} /> Ativo</label>
            <input name="password" placeholder="Nova senha (opcional)" />
            <button>Salvar</button>
          </form>
          <form action={deleteUser} style={{ marginTop: 6 }}>
            <input type="hidden" name="id" value={m.id} />
            <button>Excluir</button>
          </form>
        </div>
      ))}
    </>
  );
}
