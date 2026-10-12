import { UserPlus, X } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { shareRecord, unshareRecord } from "@/app/(app)/cadastrados/records-actions";
import type { Rec } from "@/lib/records";

// "Quem pode editar": só o criador e quem ele chamou editam; o administrador só vê, mas pode chamar pessoas.
// doc: "inicial", "acomp:N" ou "fisc". Quem foi chamado para o processo todo vale para todos os acompanhamentos dele.
export async function Collaborators({ rec, doc, canShare }: { rec: Rec; doc: string; canShare: boolean }) {
  const admin = createAdminClient();
  const { data: owner } = await admin.from("members").select("name, email").eq("id", rec.created_by).maybeSingle();
  const ownerName = (owner?.name as string) || (owner?.email as string) || "—";
  const scoped = /^acomp:\d+$/.test(doc);
  const mine = rec.meta.shared.filter((s) => (scoped ? s.doc === doc : !s.doc));
  const inherited = scoped ? rec.meta.shared.filter((s) => !s.doc) : [];
  const acompBy = scoped ? rec.meta.acomps.find((a) => `acomp:${a.n}` === doc) : undefined;

  let people: { id: string; name: string }[] = [];
  if (canShare) {
    const { data } = await admin.from("members").select("id, name, email").eq("status", "approved").order("name");
    const taken = new Set([rec.created_by, acompBy?.by_id, ...mine.map((s) => s.id)]);
    people = (data ?? []).filter((m) => !taken.has(m.id as string))
      .map((m) => ({ id: m.id as string, name: (m.name as string) || (m.email as string) }));
  }

  // identificação (autor/autora, editor/editora) conforme o que a pessoa escolheu no perfil
  const ids = [rec.created_by, acompBy?.by_id, ...rec.meta.shared.map((x) => x.id)].filter(Boolean) as string[];
  const gen = new Map<string, string>();
  await Promise.all(Array.from(new Set(ids)).map(async (uid) => {
    const { data } = await admin.auth.admin.getUserById(uid);
    gen.set(uid, String((data.user?.user_metadata as Record<string, unknown> | undefined)?.gender ?? ""));
  }));
  const tag = (uid: string, m: string, f: string) => (gen.get(uid) === "f" ? f : gen.get(uid) === "m" ? m : `${m}(a)`);

  return (
    <div className="card grid" style={{ gap: 10 }}>
      <strong><UserPlus size={16} style={{ verticalAlign: "-3px" }} /> Permissões de edição</strong>
      <span style={{ color: "var(--muted)" }}>
        Todos podem visualizar este relatório. Apenas quem o criou e os profissionais adicionados abaixo podem editá-lo.
      </span>
      <div className="pcard-chips">
        <span className="chip">{acompBy ? acompBy.by_name : ownerName} ({tag(acompBy?.by_id ?? rec.created_by, "autor", "autora")})</span>
        {scoped && acompBy && acompBy.by_id !== rec.created_by && <span className="chip">{ownerName} ({tag(rec.created_by, "autor", "autora")} do cadastro)</span>}
        {inherited.map((s) => <span key={s.id} className="chip">{s.name} ({tag(s.id, "editor", "editora")})</span>)}
      </div>
      {mine.map((s) => (
        <form key={s.id} action={unshareRecord} className="qrow">
          <input type="hidden" name="record_id" value={rec.id} />
          <input type="hidden" name="member_id" value={s.id} />
          <input type="hidden" name="doc" value={doc} />
          <strong>{s.name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({tag(s.id, "editor", "editora")})</span></strong>
          {canShare && <button className="danger" aria-label={`Remover ${s.name}`}><X size={16} /></button>}
        </form>
      ))}
      {canShare && people.length > 0 && (
        <form action={shareRecord} className="row">
          <input type="hidden" name="record_id" value={rec.id} />
          <input type="hidden" name="doc" value={doc} />
          <select name="member_id" defaultValue="" required>
            <option value="" disabled>Selecionar profissional</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button>Adicionar editor</button>
        </form>
      )}
    </div>
  );
}
