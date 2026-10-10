import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function exigirAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("perfis").select("papel,ativo").eq("id", user.id).single();
  if (data?.papel !== "admin" || !data.ativo) redirect("/documentos");
}

async function criar(formData: FormData) {
  "use server";
  await exigirAdmin();
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: String(formData.get("email")),
    password: String(formData.get("senha")),
    email_confirm: true,
  });
  if (error || !data.user) return;
  await admin.from("perfis").insert({
    id: data.user.id,
    nome: String(formData.get("nome")),
    cargo: String(formData.get("cargo") || "") || null,
    papel: formData.get("papel") === "admin" ? "admin" : "membro",
  });
  revalidatePath("/usuarios");
}

async function alternarAtivo(formData: FormData) {
  "use server";
  await exigirAdmin();
  const admin = createServiceClient();
  await admin.from("perfis").update({ ativo: formData.get("ativo") !== "true" }).eq("id", String(formData.get("id")));
  revalidatePath("/usuarios");
}

export default async function Usuarios() {
  await exigirAdmin();
  const supabase = await createClient();
  const { data: perfis } = await supabase.from("perfis").select("id,nome,cargo,papel,ativo").order("nome");
  return (
    <>
      <h1>Usuários</h1>
      <form action={criar} className="card">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" required style={{ width: "100%" }} />
        <label htmlFor="cargo">Cargo (ex.: psicóloga, assistente social)</label>
        <input id="cargo" name="cargo" />
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" required style={{ width: "100%" }} />
        <label htmlFor="senha">Senha inicial</label>
        <input id="senha" name="senha" type="password" minLength={8} required />
        <label htmlFor="papel">Papel</label>
        <select id="papel" name="papel" defaultValue="membro">
          <option value="membro">Membro</option>
          <option value="admin">Administrador</option>
        </select>
        <p><button type="submit">Criar usuário</button></p>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nome</th><th>Cargo</th><th>Papel</th><th>Acesso</th><th /></tr></thead>
          <tbody>
            {perfis?.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td><td>{p.cargo}</td><td>{p.papel}</td>
                <td>{p.ativo ? "Ativo" : "Desativado"}</td>
                <td>
                  <form action={alternarAtivo}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="ativo" value={String(p.ativo)} />
                    <button type="submit">{p.ativo ? "Desativar" : "Reativar"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
