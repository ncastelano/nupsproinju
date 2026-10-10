import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { findDoc, readText } from "@/lib/documents";
import { deleteProcess } from "../../usuarios/[id]/import-actions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Processo exportado: o texto completo, guardado no banco de dados.
export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const found = await findDoc((await params).id);
  if (!found || (found.ownerId !== me.id && me.role !== "admin")) notFound();
  const { doc } = found;
  const text = await readText(doc.path_text);

  return (
    <div className="grid" style={{ gap: 16, maxWidth: 760 }}>
      <Link href={`/usuarios/${found.ownerId}`} className="row"><ArrowLeft size={16} /> Voltar aos meus formulários</Link>

      <section className="hero">
        <h1 style={{ fontSize: 22 }}>{doc.title}</h1>
        <p>
          Exportado em {when(doc.created_at)} · {doc.source === "google" ? "link do Google Docs" : "arquivo enviado"} ·{" "}
          {doc.chars.toLocaleString("pt-BR")} caracteres
        </p>
      </section>

      <div className="row">
        <a href={`/documentos/${doc.id}/arquivo`}><button className="ghost"><Download size={16} /> Baixar original (.{doc.ext})</button></a>
        {doc.source_url && (
          <a href={doc.source_url} target="_blank" rel="noreferrer"><button className="ghost"><ExternalLink size={16} /> Abrir no Google Docs</button></a>
        )}
        <form action={deleteProcess}>
          <input type="hidden" name="id" value={doc.id} />
          <button className="danger"><Trash2 size={16} /> Apagar</button>
        </form>
      </div>

      <article className="card narrative">{text}</article>
    </div>
  );
}
