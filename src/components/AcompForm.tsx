"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { ACOMP_GROUPS } from "@/lib/acomp";
import { saveAcompanhamento } from "@/app/(app)/cadastrados/[id]/documento/actions";

// Questionário do acompanhamento: um cartão por campo, com a avaliação anterior ao lado para comparar.
export function AcompForm({
  id, n, initial, previous, redo,
}: { id: string; n: number | null; initial: Record<string, string>; previous: Record<string, string>; redo: boolean }) {
  const [msg, action, pending] = useActionState(saveAcompanhamento, null);
  return (
    <form action={action} className="grid" style={{ gap: 14 }}>
      <input type="hidden" name="record_id" value={id} />
      {n !== null && <input type="hidden" name="n" value={n} />}
      {redo && (
        <p className="help" style={{ margin: 0 }}>
          Ao salvar, o relatório será refeito a partir das respostas. Edições feitas à mão no documento serão substituídas.
        </p>
      )}
      {ACOMP_GROUPS.map((g) => (
        <section key={g.title} className="grid" style={{ gap: 12 }}>
          <h2 className="section">{g.title.toUpperCase()}</h2>
          {g.fields.map((f) => (
            <div key={f.key} className="card q">
              <label className="q-label" htmlFor={f.key}>{f.label}</label>
              {f.help && <div className="help">{f.help}</div>}
              {previous[f.key] && (
                <details className="act-more">
                  <summary>Ver a avaliação anterior</summary>
                  <div className="prev-text">{previous[f.key]}</div>
                </details>
              )}
              <textarea id={f.key} name={f.key} rows={f.rows ?? 4} defaultValue={initial[f.key] ?? ""} />
            </div>
          ))}
        </section>
      ))}
      {msg && <p className="error">{msg}</p>}
      <div className="row">
        <button disabled={pending || !id}><Save size={16} /> {pending ? "Gerando..." : "Salvar e gerar o relatório"}</button>
        <button name="intent" value="draft" className="ghost" disabled={pending || !id}>Salvar rascunho</button>
        {!id && <span className="help">Escolha o processo acima para salvar.</span>}
      </div>
    </form>
  );
}
