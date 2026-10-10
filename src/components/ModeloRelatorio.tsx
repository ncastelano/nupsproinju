"use client";
import { Fragment, useState } from "react";
import { Download, FileText, X } from "lucide-react";

type Data = { lines: string[]; sources: Record<string, string> };

// Mostra o modelo do relatório e de qual pergunta do Cadastro inicial vem cada trecho.
export function ModeloRelatorio() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !data) {
      try {
        const r = await fetch("/processos/modelo");
        if (!r.ok) throw new Error(await r.text());
        setData(await r.json());
      } catch { setErr("Não foi possível carregar o modelo."); }
    }
  }

  const title = data?.lines.find((l) => l.trim()) ?? "";
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row">
        <button type="button" className="ghost small" onClick={toggle}>
          {open ? <X size={14} /> : <FileText size={14} />} {open ? "Fechar modelo" : "Ver modelo do relatório"}
        </button>
        {open && (
          <a href="/processos/modelo?baixar=1">
            <button type="button" className="ghost small"><Download size={14} /> Baixar modelo (.docx)</button>
          </a>
        )}
      </div>

      {open && (
        <div className="card modelo">
          <div className="modelo-note">
            É isto que sai automaticamente em cada processo. Os campos em destaque são preenchidos com as
            respostas do Cadastro inicial; passe o mouse (ou toque) para ver de qual pergunta vem.
          </div>
          {err && <p className="error">{err}</p>}
          {!data && !err && <p style={{ color: "var(--muted)" }}>Carregando...</p>}
          {data && data.lines.map((line, i) => {
            const parts = line.split(/(\{\{[A-Z_]+\}\})/g);
            const heading = /^\d+(\.\d+)*\.?\s+[A-ZÀ-Ú]/.test(line.trim()) || line === title;
            return (
              <p key={i} className={heading ? "modelo-h" : "modelo-p"}>
                {parts.map((p, j) => {
                  const m = p.match(/^\{\{([A-Z_]+)\}\}$/);
                  if (!m) return <Fragment key={j}>{p}</Fragment>;
                  const src = data.sources[m[1]] ?? "";
                  return (
                    <span key={j} className="ph" title={src}>
                      {src || m[1]}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
