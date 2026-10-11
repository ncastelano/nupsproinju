import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRecord } from "@/lib/records";
import { NOTA_KEY, noteVis } from "@/lib/notes";
import { parseDocx } from "@/lib/docxDoc";
import { loadProcessDoc } from "@/lib/procDoc";
import { DocEditor } from "@/components/DocEditor";
import { NoteBar } from "@/components/NoteBar";
import { AudioPanel } from "@/components/AudioPanel";
import { FirstNote } from "@/components/FirstNote";
import { createNote } from "./actions";

// Bloco de notas: o editor de .docx já aberto, para guardar arquivos livres (só da própria pessoa).
export default async function BlocoDeNotas({ searchParams }: { searchParams: Promise<{ n?: string; new?: string }> }) {
  const me = await requireMember();
  const { n, new: isNew } = await searchParams;
  if (isNew) redirect(`/bloco-de-notas?n=${await createNote()}`);
  const { data } = await createAdminClient().from("intake_records")
    .select("id, title:answers->titulo->>value, vis:answers->visibilidade->>value, upd:answers->atualizada->>value, created_at")
    .eq("form_key", NOTA_KEY).eq("created_by", me.id).order("created_at", { ascending: false });
  const notes = (data ?? []).map((r) => ({ id: r.id as string, title: (r.title as string) || "Nota sem título", vis: noteVis(r.vis), at: (r.upd as string) || (r.created_at as string) }));

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
      <div className="note-strip">
        <Link href="/bloco-de-notas?new=1" className="note-new" prefetch={false}><Plus size={18} /> Nova nota</Link>
        {notes.map((x) => (
          <Link key={x.id} href={`/bloco-de-notas?n=${x.id}`} className={`note-card${x.id === currentId ? " on" : ""}`}>
            <strong>{x.title}</strong>
            <span>{new Date(x.at).toLocaleDateString("pt-BR")} · {x.vis === "publico" ? "Público" : "Serviço"}</span>
          </Link>
        ))}
      </div>
      <NoteBar key={currentId} notes={notes} current={currentId} title={title} visibility={notes.find((x) => x.id === currentId)!.vis} />
      <DocEditor key={`${currentId}-${doc.version}`} id={currentId} data={parsed} version={doc.version} canEdit author={me.name || me.email} docRef={{ kind: "nota" }} backHref="/" />
      <div className="card">
        <AudioPanel recordId={currentId} doc="nota" audios={rec.meta.audios ?? []} canEdit me={me.id} />
      </div>
    </div>
  );
}
