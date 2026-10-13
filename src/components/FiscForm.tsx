"use client";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { FISC_SECTIONS, OTHER, rowKey, visible, type FQ, type FSection } from "@/lib/fisc";
import { ChoiceField } from "@/components/ChoiceField";
import { saveResponses } from "@/app/(app)/fiscalizacoes/actions";

type Vals = Record<string, string>;

export function QInput({ q, vals, set }: { q: FQ; vals: Vals; set: (k: string, v: string) => void }) {
  const v = vals[q.key] ?? "";
  if (q.type === "textarea") return <textarea name={q.key} rows={5} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "date") return <input type="date" name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "number") return <input type="number" min={0} name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "text") return <input type="text" name={q.key} value={v} onChange={(e) => set(q.key, e.target.value)} />;
  if (q.type === "select")
    return <ChoiceField key={q.key} name={q.key} title={q.label} options={q.options ?? []} initial={v ? [v] : []} onChange={(sel) => set(q.key, sel[0] ?? "")} />;
  if (q.type === "radio") {
    const isOther = v.startsWith(OTHER);
    return (
      <ChoiceField
        key={q.key} name={q.key} title={q.label} other={!!q.other} options={q.options ?? []}
        initial={isOther ? ["Outro"] : v ? [v] : []} initialOther={isOther ? v.slice(OTHER.length) : ""}
        onChange={(sel, text) => set(q.key, sel[0] === "Outro" ? OTHER + text : sel[0] ?? "")}
      />
    );
  }
  if (q.type === "checkbox") {
    const picked = v ? v.split("; ") : [];
    const otherItem = picked.find((p) => p.startsWith(OTHER));
    return (
      <ChoiceField
        key={q.key} name={q.key} title={q.label} multiple other={!!q.other} options={q.options ?? []}
        initial={[...picked.filter((p) => !p.startsWith(OTHER)), ...(otherItem !== undefined ? ["Outro"] : [])]}
        initialOther={otherItem?.slice(OTHER.length) ?? ""}
        onChange={(sel, text) => set(q.key, [...sel.filter((x) => x !== "Outro"), ...(sel.includes("Outro") ? [OTHER + text] : [])].join("; "))}
      />
    );
  }
  // matrix: uma linha por item, com a opção escolhida numa lista de uma linha só
  return (
    <div className="fisc-matrix">
      {(q.rows ?? []).map((r, i) => {
        const k = rowKey(q.key, i);
        return (
          <div key={k} className="fisc-row line">
            <span className="fisc-row-label">{r}</span>
            <ChoiceField
              name={k} title={`${q.label} — ${r}`} options={q.options ?? []}
              initial={vals[k] ? [vals[k]] : []} onChange={(sel) => set(k, sel[0] ?? "")}
            />
          </div>
        );
      })}
    </div>
  );
}

// Questionário da fiscalização: uma pergunta por cartão; as que dependem de outra resposta só aparecem quando cabem.
export function FiscForm({ id, initial, redo, sections, initialProcess = "" }: {
  id: string; initial: Vals; redo: boolean; sections?: FSection[]; initialProcess?: string;
}) {
  const [proc, setProc] = useState(initialProcess);
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
      <input type="hidden" name="processos_campo" value="1" />
      <div className="card q">
        <label className="q-label">Número do processo da fiscalização</label>
        <div className="help">A fiscalização tem o seu próprio processo, separado do Cadastro inicial e dos acompanhamentos.</div>
        <input type="text" name="processos" value={proc} onChange={(e) => setProc(e.target.value)} placeholder="0000000-00.0000.0.00.0000" autoComplete="off" />
      </div>
      {(sections ?? FISC_SECTIONS).map((sec) => {
        const qs = sec.questions.filter((qn) => visible(qn, get));
        return (
          <section key={sec.title} className="grid" style={{ gap: 12 }}>
            <h2 className="section">{sec.title.toUpperCase()}</h2>
            {qs.map((qn) => (
              <div key={qn.key} className="card q">
                <label className="q-label">{qn.label}{qn.required && <span className="req"> *</span>}</label>
                {qn.help && <div className="help">{qn.help}</div>}
                <QInput q={qn} vals={vals} set={set} />
              </div>
            ))}
          </section>
        );
      })}
      {msg && <p className="error">{msg}</p>}
      <div className="row">
        <button disabled={pending}><Save size={16} /> {pending ? "Salvando..." : "Salvar e Gerar Relatório"}</button>
        {!redo && <button name="intent" value="draft" formNoValidate className="ghost" disabled={pending}>Salvar rascunho</button>}
      </div>
    </form>
  );
}
