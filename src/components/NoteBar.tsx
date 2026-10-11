"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { DownloadMenu } from "@/components/DownloadMenu";
import { createNote, deleteNote, renameNote, setNoteVisibility } from "@/app/(app)/bloco-de-notas/actions";

// Barra do Bloco de notas: trocar de nota, nova nota, renomear, baixar e apagar.
export function NoteBar({ notes, current, title, visibility }: { notes: { id: string; title: string }[]; current: string; title: string; visibility: "privado" | "perfil" }) {
  const router = useRouter();
  const [name, setName] = useState(title);
  const [ask, setAsk] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [vis, setVis] = useState(visibility);
  const [pending, start] = useTransition();

  const rename = () => start(async () => {
    const r = await renameNote(current, name);
    if (r === "ok") { setSaved(true); setTimeout(() => setSaved(false), 1500); router.refresh(); } else setErr(r);
  });

  return (
    <div className="card grid" style={{ gap: 10 }}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <select value={current} onChange={(e) => router.push(`/bloco-de-notas?n=${e.target.value}`)} style={{ maxWidth: 280 }}>
          {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
        <button className="ghost" disabled={pending} onClick={() => start(async () => { router.push(`/bloco-de-notas?n=${await createNote()}`); })}>
          <Plus size={16} /> Nova nota
        </button>
        <DownloadMenu href={`/bloco-de-notas/${current}/baixar`} />
        {!ask ? (
          <button className="danger" onClick={() => setAsk(true)}><Trash2 size={16} /> Apagar nota</button>
        ) : (
          <span className="confirm-del">
            <span>Apagar esta nota?</span>
            <button className="danger" disabled={pending} onClick={() => start(async () => {
              const r = await deleteNote(current);
              if (r === "ok") router.push("/bloco-de-notas"); else setErr(r);
            })}>Sim, apagar</button>
            <button className="ghost" onClick={() => setAsk(false)}>Cancelar</button>
          </span>
        )}
      </div>
      <div className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() !== title && rename()} placeholder="Título da nota" style={{ flex: 1, minWidth: 180 }} />
        <select
          value={vis} title="Quem pode ver esta nota"
          onChange={(e) => {
            const v = e.target.value as "privado" | "perfil";
            setVis(v);
            start(async () => { const r = await setNoteVisibility(current, v); if (r !== "ok") setErr(r); });
          }}
          style={{ width: "auto" }}
        >
          <option value="privado">Só para mim</option>
          <option value="perfil">Aparece no meu perfil</option>
        </select>
        {saved && <span className="doc-ok"><Check size={14} style={{ verticalAlign: "-2px" }} /> Título salvo</span>}
      </div>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
