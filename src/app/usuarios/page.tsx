import { requireAdmin, type Member } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/Topbar";
import { createUser, updateUser, deleteUser } from "./actions";

export default async function UsuariosPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("*").order("email");
  const members = (data ?? []) as Member[];

  return (
    <>
      <Topbar name={me.name || me.email} isAdmin />
      <div className="container grid" style={{ gap: 16 }}>
        <h1 style={{ margin: "8px 0 0" }}>Usuários</h1>

        <form action={createUser} className="card grid">
          <strong>Adicionar pessoa</strong>
          <div className="row">
            <input name="name" placeholder="Nome" />
            <input name="email" type="email" placeholder="E-mail" required />
            <input name="password" placeholder="Senha (mín. 6)" minLength={6} required />
            <select name="role"><option value="member">Membro</option><option value="admin">Administrador</option></select>
            <button>Criar</button>
          </div>
        </form>

        <strong>Pessoas com acesso ({members.length})</strong>
        {members.map((m) => (
          <div key={m.id} className="card grid">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{m.email}</strong>
              <span className={m.active ? "badge" : "badge off"}>
                {m.role === "admin" ? "Administrador" : "Membro"}{m.active ? "" : " · inativo"}
              </span>
            </div>
            <form action={updateUser} className="row">
              <input type="hidden" name="id" value={m.id} />
              <input name="name" defaultValue={m.name} placeholder="Nome" />
              <select name="role" defaultValue={m.role}><option value="member">Membro</option><option value="admin">Administrador</option></select>
              <input name="password" placeholder="Nova senha (opcional)" />
              <label className="check"><input type="checkbox" name="active" defaultChecked={m.active} /> Ativo</label>
              <button className="ghost">Salvar</button>
            </form>
            {m.id !== me.id && (
              <form action={deleteUser}>
                <input type="hidden" name="id" value={m.id} />
                <button className="danger">Excluir</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
