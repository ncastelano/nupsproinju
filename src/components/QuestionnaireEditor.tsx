"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { FQ, FSection, FType } from "@/lib/fisc";

const LABEL: Record<FType, string> = {
  text: "Resposta curta", textarea: "Resposta longa", number: "Número", date: "Data",
  select: "Lista suspensa", radio: "Escolha uma opção", checkbox: "Caixas de seleção", matrix: "Grade (vários itens)",
};
const rnd = () => "n_" + Math.random().toString(36).slice(2, 8);
const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const c = [...arr];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

// Editor do questionário (administrador): texto, ajuda, tipo, opções, obrigatória; adicionar, apagar e reordenar.
export function QuestionnaireEditor({
  initial, allowedTypes, hint, onChange,
}: { initial: FSection[]; allowedTypes: FType[]; hint?: string; onChange: (s: FSection[]) => void }) {
  const [secs, setSecs] = useState<FSection[]>(() => structuredClone(initial));
  const set = (next: FSection[]) => { setSecs(next); onChange(next); };
  const upd = (si: number, qi: number, patch: Partial<FQ>) =>
    set(secs.map((s, a) => (a !== si ? s : { ...s, questions: s.questions.map((q, b) => (b !== qi ? q : { ...q, ...patch })) })));
  const del = (si: number, qi: number) => {
    const key = secs[si].questions[qi].key;
    set(secs.map((s, a) => (a !== si ? s : { ...s, questions: s.questions.filter((_, b) => b !== qi) }))
      .map((s) => ({ ...s, questions: s.questions.map((q) => (q.showIf?.key === key ? { ...q, showIf: undefined } : q)) })));
  };
  const addQ = (si: number) =>
    set(secs.map((s, a) => (a !== si ? s : { ...s, questions: [...s.questions, { key: rnd(), label: "Nova pergunta", type: "text" as FType }] })));

  return (
    <div className="gf gf-edit-wrap">
      {hint && <p className="help" style={{ margin: 0 }}>{hint}</p>}
      {secs.map((sec, si) => (
        <div key={si} className="gf-section">
          <div className="gf-tab">Seção {si + 1} de {secs.length}</div>
          <div className="gf-card gf-sec-head gf-edit-row">
            <input
              value={sec.title} aria-label="Título da seção" placeholder="Título da seção"
              onChange={(e) => set(secs.map((s, a) => (a === si ? { ...s, title: e.target.value } : s)))}
            />
            <div className="gf-edit-btns">
              <button type="button" className="ghost icon" title="Subir seção" onClick={() => set(move(secs, si, -1))}><ArrowUp size={16} /></button>
              <button type="button" className="ghost icon" title="Descer seção" onClick={() => set(move(secs, si, 1))}><ArrowDown size={16} /></button>
              <button
                type="button" className="danger icon" title="Apagar seção e suas perguntas"
                onClick={() => { if (secs.length > 1 && confirm(`Apagar a seção “${sec.title}” e suas ${sec.questions.length} perguntas?`)) set(secs.filter((_, a) => a !== si)); }}
              ><Trash2 size={16} /></button>
            </div>
          </div>

          {sec.questions.map((q, qi) => {
            const choice = ["select", "radio", "checkbox", "matrix"].includes(q.type);
            return (
              <div key={q.key} className="gf-card gf-edit">
                <textarea rows={2} value={q.label} aria-label="Pergunta" placeholder="Pergunta" onChange={(e) => upd(si, qi, { label: e.target.value })} />
                <input value={q.help ?? ""} aria-label="Texto de ajuda" placeholder="Texto de ajuda (opcional)" onChange={(e) => upd(si, qi, { help: e.target.value })} />
                <div className="gf-edit-opts">
                  <select value={q.type} aria-label="Tipo de resposta" onChange={(e) => upd(si, qi, { type: e.target.value as FType })}>
                    {allowedTypes.map((t) => <option key={t} value={t}>{LABEL[t]}</option>)}
                  </select>
                  <label className="chip"><input type="checkbox" checked={!!q.required} onChange={(e) => upd(si, qi, { required: e.target.checked })} /> <span>Obrigatória</span></label>
                  {(q.type === "radio" || q.type === "checkbox") && (
                    <label className="chip"><input type="checkbox" checked={!!q.other} onChange={(e) => upd(si, qi, { other: e.target.checked })} /> <span>Tem opção “Outro”</span></label>
                  )}
                </div>
                {choice && (
                  <textarea
                    rows={Math.min(8, Math.max(3, (q.options?.length ?? 0) + 1))} aria-label="Opções"
                    placeholder={q.type === "matrix" ? "Colunas de resposta (uma por linha)" : "Opções (uma por linha)"}
                    value={(q.options ?? []).join("\n")}
                    onChange={(e) => upd(si, qi, { options: e.target.value.split("\n") })}
                    onBlur={(e) => upd(si, qi, { options: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                  />
                )}
                {q.type === "matrix" && (
                  <textarea
                    rows={Math.min(8, Math.max(3, (q.rows?.length ?? 0) + 1))} aria-label="Itens da grade" placeholder="Itens da grade (um por linha)"
                    value={(q.rows ?? []).join("\n")}
                    onChange={(e) => upd(si, qi, { rows: e.target.value.split("\n") })}
                    onBlur={(e) => upd(si, qi, { rows: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
                  />
                )}
                {q.showIf && <div className="gf-cond">Aparece conforme outra resposta (mantido)</div>}
                <div className="gf-edit-foot">
                  <span className="help" style={{ margin: 0 }}>Campo no modelo do relatório: <code>{`{{Q:${q.key}}}`}</code></span>
                  <div className="gf-edit-btns">
                    <button type="button" className="ghost icon" title="Subir" onClick={() => set(secs.map((s, a) => (a === si ? { ...s, questions: move(s.questions, qi, -1) } : s)))}><ArrowUp size={16} /></button>
                    <button type="button" className="ghost icon" title="Descer" onClick={() => set(secs.map((s, a) => (a === si ? { ...s, questions: move(s.questions, qi, 1) } : s)))}><ArrowDown size={16} /></button>
                    <button type="button" className="danger icon" title="Apagar pergunta" onClick={() => del(si, qi)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
          <button type="button" className="ghost" style={{ justifySelf: "start" }} onClick={() => addQ(si)}><Plus size={16} /> Adicionar pergunta</button>
        </div>
      ))}
      <button type="button" onClick={() => set([...secs, { title: "Nova seção", questions: [{ key: rnd(), label: "Nova pergunta", type: "text" }] }])} style={{ justifySelf: "start" }}>
        <Plus size={16} /> Nova seção
      </button>
    </div>
  );
}
