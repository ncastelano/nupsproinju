import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecord } from "@/lib/records";
import { NOTA_KEY } from "@/lib/notes";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";
import { NoteBar } from "@/components/NoteBar";
import { FirstNote } from "@/components/FirstNote";

// Bloco de notas: o editor de .docx já aberto, para guardar arquivos livres (só da própria pessoa).
export default async function BlocoDeNotas({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const me = await requireMember();
  const { n } = await searchParams;
  const { data } = await createAdminClient().from("intake_records")
    .select("id, title:answers->titulo->>value, vis:answers->visibilidade->>value, created_at")
    .eq("form_key", NOTA_KEY).eq("created_by", me.id).order("created_at", { ascending: false });
  const notes = (data ?? []).map((r) => ({ id: r.id as string, title: (r.title as string) || "Nota sem título", vis: (r.vis as string) === "perfil" ? "perfil" as const : "privado" as const }));

  // primeira vez: o navegador cria a primeira nota e o editor abre pronto
  // (não criamos aqui, para o pré-carregamento do link não gerar notas à toa)
  if (notes.length === 0) return <FirstNote />;
  const currentId = notes.find((x) => x.id === n)?.id ?? notes[0].id;

  const rec = await loadRecord(currentId, NOTA_KEY);
  if (!rec || rec.created_by !== me.id) redirect("/bloco-de-notas");
  const doc = await loadProcessDoc(rec, { kind: "nota" }, me);
  if (!doc) return <div className="card"><p className="error">O modelo do documento não está disponível. Peça ao administrador para enviá-lo.</p></div>;
  const parsed = await parseDocx(doc.buf);
  const title = notes.find((x) => x.id === currentId)!.title;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <NoteBar key={currentId} notes={notes} current={currentId} title={title} visibility={notes.find((x) => x.id === currentId)!.vis} />
      <DocEditor key={currentId} id={currentId} data={parsed} version={doc.version} canEdit author={me.name || me.email} docRef={{ kind: "nota" }} backHref="/" />
    </div>
  );
}
