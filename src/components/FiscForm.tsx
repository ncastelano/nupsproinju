"use client";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { FISC_SECTIONS, OTHER, rowKey, visible, type FQ } from "@/lib/fisc";
import { saveResponses } from "@/app/(app)/fiscalizacoes/actions";

type Vals = Record<string, string>;

function Input({ q, vals, set }: { q: FQ; vals: Vals; set: (k: string, v: string) => void }) {
  const v = vals[q.key] ?? "";
  if (q.type === "textarea") return <textarea name={q.key} rows={5} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "date") return <input type="date" name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "number") return <input type="number" min={0} name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "text") return <input type="text" name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "select")
    return (
      <select name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)}>
        <option value="" disabled>Selecione...</option>
        {(q.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  if (q.type === "radio") {
    const isOther = v.startsWith(OTHER);
    const opts = [...(q.options ?? []), ...(q.other ? ["Outro"] : [])];
    return (
      <div className="chips">
        {opts.map((o) => (
          <label key={o} className="chip">
            <input type="radio" name={q.key} value={o}
              checked={o === "Outro" ? isOther : v === o}
              onChange={() => set(q.key, o === "Outro" ? OTHER : o)} />
            <span>{o}</span>
          </label>
        ))}
        {q.other && isOther && (
          <input name={`${q.key}__outro`} placeholder="Qual?" style={{ flexBasis: "100%" }}
            value={v.slice(OTHER.length)} onChange={(e) => set(q.key, OTHER + e.target.value)} />
        )}
      </div>
    );
  }
  if (q.type === "checkbox") {
    const picked = v ? v.split("; ") : [];
    const otherItem = picked.find((p) => p.startsWith(OTHER));
    const toggle = (o: string, on: boolean) => {
      const base = picked.filter((p) => (o === "Outro" ? !p.startsWith(OTHER) : p !== o));
      set(q.key, [...base, ...(on ? [o === "Outro" ? OTHER : o] : [])].join("; "));
    };
    const opts = [...(q.options ?? []), ...(q.other ? ["Outro"] : [])];
    return (
      <div className="chips">
        {opts.map((o) => (
          <label key={o} className="chip">
            <input type="checkbox" name={q.key} value={o}
              checked={o === "Outro" ? otherItem !== undefined : picked.includes(o)}
              onChange={(e) => toggle(o, e.target.checked)} />
            <span>{o}</span>
          </label>
        ))}
        {q.other && otherItem !== undefined && (
          <input name={`${q.key}__outro`} placeholder="Qual?" style={{ flexBasis: "100%" }}
            value={otherItem.slice(OTHER.length)}
            onChange={(e) => set(q.key, [...picked.filter((p) => !p.startsWith(OTHER)), OTHER + e.target.value].join("; "))} />
        )}
      </div>
    );
  }
  // matrix: uma linha por item, uma opção por linha
  return (
    <div className="fisc-matrix">
      {(q.rows ?? []).map((r, i) => {
        const k = rowKey(q.key, i);
        return (
          <div key={k} className="fisc-row">
            <span className="fisc-row-label">{r}</span>
            <div className="chips">
              {(q.options ?? []).map((o) => (
                <label key={o} className="chip">
                  <input type="radio" name={k} value={o} checked={vals[k] === o} onChange={() => set(k, o)} />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Questionário da fiscalização: uma pergunta por cartão; as que dependem de outra resposta só aparecem quando cabem.
export function FiscForm({ id, initial, redo }: { id: string; initial: Vals; redo: boolean }) {
  const [vals, setVals] = useState<Vals>(initial);
  const [msg, action, pending] = useActionState(saveResponses, null);
  const set = (k: string, v: string) => setVals((cur) => ({ ...cur, [k]: v }));
  const get = (k: string) => vals[k] ?? "";

  return (
    <form action={action} className="grid" style={{ gap: 14 }}>
      {id && <input type="hidden" name="record_id" value={id} />}
      {redo && (
        <p className="help" style={{ margin: 0 }}>
          Ao salvar, o relatório será refeito a partir das respostas. Edições feitas à mão no documento serão substituídas.
        </p>
      )}
      {FISC_SECTIONS.map((sec) => {
        const qs = sec.questions.filter((qn) => visible(qn, get));
        return (
          <section key={sec.title} className="grid" style={{ gap: 12 }}>
            <h2 className="section">{sec.title.toUpperCase()}</h2>
            {qs.map((qn) => (
              <div key={qn.key} className="card q">
                <label className="q-label">{qn.label}{qn.required && <span className="req"> *</span>}</label>
                {qn.help && <div className="help">{qn.help}</div>}
                <Input q={qn} vals={vals} set={set} />
              </div>
            ))}
          </section>
        );
      })}
      {msg && <p className="error">{msg}</p>}
      <div className="row">
        <button disabled={pending}><Save size={16} /> {pending ? "Salvando..." : "Salvar e gerar o relatório"}</button>
        {!redo && <button name="intent" value="draft" formNoValidate className="ghost" disabled={pending}>Salvar rascunho</button>}
      </div>
    </form>
  );
}
