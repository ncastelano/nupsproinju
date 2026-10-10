import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function criar(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("documentos").insert({
    titulo: String(formData.get("titulo")),
    formato: String(formData.get("formato") || "") || null,
    google_doc_id: String(formData.get("google_doc_id") || "") || null,
    visibilidade: formData.get("visibilidade") === "todos" ? "todos" : "privado",
    criado_por: user.id,
  });
  revalidatePath("/documentos");
}

async function alternar(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const novo = formData.get("atual") === "todos" ? "privado" : "todos";
  await supabase.from("documentos").update({ visibilidade: novo }).eq("id", String(formData.get("id")));
  revalidatePath("/documentos");
}

export default async function Documentos() {
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("documentos")
    .select("id,titulo,formato,google_doc_id,visibilidade,criado_em")
    .order("criado_em", { ascending: false });

  return (
    <>
      <h1>Documentos</h1>
      <form action={criar} className="card">
        <label htmlFor="titulo">Título</label>
        <input id="titulo" name="titulo" required style={{ width: "100%" }} />
        <label htmlFor="formato">Formato (ex.: laudo, parecer)</label>
        <input id="formato" name="formato" />
        <label htmlFor="google_doc_id">ID do Google Docs</label>
        <input id="google_doc_id" name="google_doc_id" />
        <label htmlFor="visibilidade">Visibilidade</label>
        <select id="visibilidade" name="visibilidade" defaultValue="privado">
          <option value="privado">Privado</option>
          <option value="todos">Compartilhado com todos</option>
        </select>
        <p><button type="submit">Adicionar documento</button></p>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Título</th><th>Formato</th><th>Visibilidade</th><th /></tr></thead>
          <tbody>
            {docs?.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.google_doc_id
                    ? <a href={`https://docs.google.com/document/d/${d.google_doc_id}/edit`} target="_blank" rel="noreferrer">{d.titulo}</a>
                    : d.titulo}
                </td>
                <td>{d.formato}</td>
                <td>{d.visibilidade === "todos" ? "Todos" : "Privado"}</td>
                <td>
                  <form action={alternar}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="atual" value={d.visibilidade} />
                    <button type="submit">{d.visibilidade === "todos" ? "Tornar privado" : "Compartilhar com todos"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!docs?.length && <p>Nenhum documento ainda.</p>}
      </div>
    </>
  );
}
