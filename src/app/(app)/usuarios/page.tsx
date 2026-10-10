import { requireAdmin, type Member } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createUser, updateUser, deleteUser, setStatus } from "./actions";

const STATUS_LABEL = { pending: "Aguardando", approved: "Aprovado", rejected: "Recusado" } as const;

function StatusButton({ id, status, label, cls }: { id: string; status: string; label: string; cls?: string }) {
  return (
    <form action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={cls}>{label}</button>
    </form>
  );
}

export default async function UsuariosPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("members").select("*").order("created_at", { ascending: false });
  const members = (data ?? []) as Member[];
  const pending = members.filter((m) => m.status === "pending");
  const others = members.filter((m) => m.status !== "pending");

  return (
    <>
      <div className="grid" style={{ gap: 16 }}>
        <h1 style={{ margin: "8px 0 0" }}>Usuários</h1>

        <strong>Pedidos de acesso ({pending.length})</strong>
        {pending.length === 0 && <div className="card" style={{ color: "var(--muted)" }}>Nenhum pedido aguardando.</div>}
        {pending.map((m) => (
          <div key={m.id} className="card row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{m.name || "(sem nome)"}</strong>
              <div style={{ color: "var(--muted)" }}>{m.email}</div>
            </div>
            <div className="row">
              <StatusButton id={m.id} status="approved" label="Aceitar" />
              <StatusButton id={m.id} status="rejected" label="Recusar" cls="danger" />
            </div>
          </div>
        ))}

        <form action={createUser} className="card grid">
          <strong>Adicionar pessoa direto (já aprovada)</strong>
          <div className="row">
            <input name="name" placeholder="Nome" />
            <input name="email" type="email" placeholder="E-mail" required />
            <input name="password" placeholder="Senha (mín. 6)" minLength={6} required />
            <select name="role"><option value="member">Membro</option><option value="admin">Administrador</option></select>
            <button>Criar</button>
          </div>
        </form>

        <strong>Demais pessoas ({others.length})</strong>
        {others.map((m) => (
          <div key={m.id} className="card grid">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{m.email}</strong>
              <span className={m.status === "approved" ? "badge" : "badge off"}>
                {m.role === "admin" ? "Administrador" : "Membro"} · {STATUS_LABEL[m.status]}
              </span>
            </div>
            <form action={updateUser} className="row">
              <input type="hidden" name="id" value={m.id} />
              <input name="name" defaultValue={m.name} placeholder="Nome" />
              <select name="role" defaultValue={m.role}><option value="member">Membro</option><option value="admin">Administrador</option></select>
              <input name="password" placeholder="Nova senha (opcional)" />
              <button className="ghost">Salvar</button>
            </form>
            {m.id !== me.id && (
              <div className="row">
                {m.status === "approved"
                  ? <StatusButton id={m.id} status="rejected" label="Revogar acesso" cls="danger" />
                  : <StatusButton id={m.id} status="approved" label="Aceitar" />}
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="danger">Excluir</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
