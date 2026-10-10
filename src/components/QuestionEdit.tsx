"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw } from "lucide-react";
import type { Question } from "@/lib/forms";
import { resetQuestionEdit, saveQuestionEdit } from "@/app/(app)/formulario/custom-actions";

const HAS_OPTIONS = ["select", "radio", "radio_other", "checkbox"];

// Botão "Editar pergunta" de cada cartão. Fica fora de <form>: envia por conta própria.
export function QuestionEdit({ q, formKey }: { q: Question; formKey: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(q.label);
  const [help, setHelp] = useState(q.help);
  const [options, setOptions] = useState(q.options.join("\n"));
  const [required, setRequired] = useState(q.required);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const hasOptions = HAS_OPTIONS.includes(q.type);

  const body = () => {
    const fd = new FormData();
    fd.set("form_key", formKey);
    fd.set("key", q.key);
    return fd;
  };

  function save() {
    const fd = body();
    fd.set("label", label);
    fd.set("help", help);
    if (required) fd.set("required", "on");
    if (hasOptions) { fd.set("has_options", "1"); fd.set("options", options); }
    start(async () => {
      const r = await saveQuestionEdit(fd);
      if (r === "ok") { setOpen(false); setMsg(null); router.refresh(); } else setMsg(r);
    });
  }

  function reset() {
    start(async () => {
      const r = await resetQuestionEdit(body());
      if (r === "ok") { setOpen(false); router.refresh(); } else setMsg(r);
    });
  }

  return (
    <div className="q-edit">
      <div className="row">
        <button type="button" className="ghost small" onClick={() => setOpen((o) => !o)}>
          <Pencil size={14} /> {open ? "Fechar" : "Editar pergunta"}
        </button>
        {q.overridden && <span className="badge">ajustada por você</span>}
      </div>

      {open && (
        <div className="grid" style={{ gap: 10, marginTop: 10 }}>
          <label className="field"><span>Pergunta</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} /></label>
          <label className="field"><span>Texto de ajuda</span>
            <input value={help} onChange={(e) => setHelp(e.target.value)} /></label>
          {hasOptions && (
            <label className="field"><span>Respostas prontas (uma por linha)</span>
              <textarea rows={Math.min(Math.max(q.options.length, 3), 8)} value={options} onChange={(e) => setOptions(e.target.value)} /></label>
          )}
          <label className="check"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Resposta obrigatória</label>
          <div className="row">
            <button type="button" onClick={save} disabled={pending}>{pending ? "Salvando..." : "Salvar pergunta"}</button>
            {q.overridden && (
              <button type="button" className="ghost" onClick={reset} disabled={pending}>
                <RotateCcw size={14} /> Voltar ao original
              </button>
            )}
          </div>
          {msg && <p className="error">{msg}</p>}
          <small style={{ color: "var(--muted)" }}>
            A alteração vale só para você e não muda os formulários já salvos.
          </small>
        </div>
      )}
    </div>
  );
}
