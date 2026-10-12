import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DocEditor } from "@/components/DocEditor";
import { DownloadMenu } from "@/components/DownloadMenu";
import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecord } from "@/lib/records";
import { NOTA_KEY, noteVis } from "@/lib/notes";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";

export const dynamic = "force-dynamic";

// Nota aberta para leitura. "Público": qualquer pessoa com o link. "Serviço": só quem tem conta no sistema.
export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = await loadRecord(id, NOTA_KEY);
  if (!rec) notFound();
  const viewer = await getMember();
  const inside = !!viewer && viewer.status === "approved";
  if (inside && rec.created_by === viewer!.id) redirect(`/bloco-de-notas?n=${id}`);
  const vis = noteVis(rec.answers.visibilidade?.value);
  if (vis === "servico" && !inside) redirect(`/login?next=${encodeURIComponent(`/nota/${id}`)}`);

  const doc = await loadProcessDoc(rec, { kind: "nota" });
  if (!doc) notFound();
  const data = await parseDocx(doc.buf);
  const { data: owner } = await createAdminClient().from("members").select("name").eq("id", rec.created_by).maybeSingle();

  const body = (
    <div className="grid" style={{ gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>{rec.answers.titulo?.value || "Nota"}</h1>
          <span style={{ color: "var(--muted)" }}>Nota de {(owner?.name as string) || "—"} · {vis === "publico" ? "Pública" : "Rascunho"}</span>
        </div>
        <DownloadMenu href={`/bloco-de-notas/${id}/baixar`} />
      </div>
      <DocEditor id={id} data={data} version={doc.version} canEdit={false} docRef={{ kind: "nota" }} backHref="/" />
    </div>
  );

  if (inside) return <AppShell>{body}</AppShell>;
  return (
    <>
      <header className="app-header">
        <div className="inner">
          <Link href="/login" className="app-brand">PROINJU</Link>
          <span style={{ color: "#fff", fontSize: 14 }}>Núcleo Psicossocial · Porto Velho/RO</span>
        </div>
      </header>
      <div className="container grid" style={{ gap: 16 }}>{body}</div>
    </>
  );
}
