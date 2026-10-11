import { notFound, redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecord } from "@/lib/records";
import { NOTA_KEY } from "@/lib/notes";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";
import { DownloadMenu } from "@/components/DownloadMenu";

// Nota de outra pessoa, aberta para leitura (só quando ela deixou aparecer no perfil).
export default async function NotaPublica({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const rec = await loadRecord(id, NOTA_KEY);
  if (!rec) notFound();
  if (rec.created_by === me.id) redirect(`/bloco-de-notas?n=${id}`);
  if (rec.answers.visibilidade?.value !== "perfil") notFound();

  const doc = await loadProcessDoc(rec, { kind: "nota" });
  if (!doc) notFound();
  const data = await parseDocx(doc.buf);
  const { data: owner } = await createAdminClient().from("members").select("name").eq("id", rec.created_by).maybeSingle();

  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0 }}>{rec.answers.titulo?.value || "Nota"}</h1>
          <span style={{ color: "var(--muted)" }}>Nota de {(owner?.name as string) || "—"}</span>
        </div>
        <DownloadMenu href={`/bloco-de-notas/${id}/baixar`} />
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={false} docRef={{ kind: "nota" }} backHref="/" />
    </div>
  );
}
