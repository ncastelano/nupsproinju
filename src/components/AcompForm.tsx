"use client";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { ACOMP_SECTIONS } from "@/lib/acomp";
import { visible } from "@/lib/fisc";
import { ChoiceField } from "@/components/ChoiceField";
import { QInput } from "@/components/FiscForm";
import { saveAcompanhamento } from "@/app/(app)/cadastrados/[id]/documento/actions";

// Questionário do acompanhamento: um cartão por pergunta, com a avaliação anterior para comparar.
export function AcompForm({
  id, n, initial, previous, redo, proOptions, signature,
}: {
  id: string; n: number | null; initial: Record<string, string>; previous: Record<string, string>; redo: boolean;
  proOptions: string[]; signature: string;
}) {
  const [msg, action, pending] = useActionState(saveAcompanhamento, null);
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const set = (k: string, v: string) => setVals((cur) => ({ ...cur, [k]: v }));
  const get = (k: string) => vals[k] ?? "";
  const pickedPros = (initial.prof ? initial.prof.split("; ") : []).filter(Boolean);
  const proInitial = pickedPros.length ? pickedPros : signature ? [signature] : [];

  return (
    <form action={action} className="grid" style={{ gap: 14 }}>
      <input type="hidden" name="record_id" value={id} />
      {n !== null && <input type="hidden" name="n" value={n} />}
      {redo && (
        <p className="help" style={{ margin: 0 }}>
          Ao salvar, o relatório será refeito a partir das respostas. Edições feitas à mão no documento serão substituídas.
        </p>
      )}
      {ACOMP_SECTIONS.map((sec) => (
        <section key={sec.title} className="grid" style={{ gap: 12 }}>
          <h2 className="section">{sec.title.toUpperCase()}</h2>
          {sec.questions.filter((q) => visible(q, get)).map((q) => (
            <div key={q.key} className="card q">
              <label className="q-label">{q.label}{q.required && <span className="req"> *</span>}</label>
              {q.help && <div className="help">{q.help}</div>}
              {previous[q.key] && (
                <details className="act-more">
                  <summary>Ver a avaliação anterior</summary>
                  <div className="prev-text">{previous[q.key]}</div>
                </details>
              )}
              {q.key === "prof" ? (
                <ChoiceField name="prof" title={q.label} multiple options={proOptions} initial={proInitial} placeholder="Selecione os profissionais..." />
              ) : (
                <QInput q={q} vals={vals} set={set} />
              )}
            </div>
          ))}
        </section>
      ))}
      {msg && <p className="error">{msg}</p>}
      <div className="row">
        <button disabled={pending || !id}><Save size={16} /> {pending ? "Gerando..." : "Salvar e gerar o relatório"}</button>
        <button name="intent" value="draft" formNoValidate className="ghost" disabled={pending || !id}>Salvar rascunho</button>
        {!id && <span className="help">Escolha o processo acima para salvar.</span>}
      </div>
    </form>
  );
}
