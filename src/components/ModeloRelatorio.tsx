"use client";
import { Fragment, useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Upload, X } from "lucide-react";
import { replaceReportTemplate } from "@/app/(app)/processos/modelo/actions";

type Data = { lines: string[]; sources: Record<string, string> };

// Mostra o modelo do relatório e de qual pergunta do Cadastro inicial vem cada trecho.
export function ModeloRelatorio({ canEdit = false }: { canEdit?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, action, pending] = useActionState(replaceReportTemplate, null);
  const [fname, setFname] = useState("");
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
  const okMsg = msg?.startsWith("ok:") ? msg.slice(3) : null;
  useEffect(() => {
    if (!okMsg) return;
    setFname("");
    fetch("/processos/modelo").then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(d));
    router.refresh();
  }, [okMsg]); // eslint-disable-line react-hooks/exhaustive-deps
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
          {canEdit && (
            <form
              action={action}
              className="modelo-edit"
            >
              <strong>Editar o modelo</strong>
              <span>
                1) Clique em <b>Baixar modelo (.docx)</b>; 2) edite no Word (textos, títulos, ordem), mantendo os campos
                em destaque entre chaves duplas, como <code>{"{{PROCESSO}}"}</code>; 3) envie o arquivo aqui.
                A versão anterior fica guardada.
              </span>
              <div className="row">
                <label className="ghost small file-pick">
                  <Upload size={14} /> {fname || "Escolher .docx editado"}
                  <input name="file" type="file" accept=".docx" hidden onChange={(e) => setFname(e.target.files?.[0]?.name ?? "")} />
                </label>
                <button className="small" disabled={pending || !fname}>
                  {pending ? "Enviando..." : "Substituir modelo"}
                </button>
              </div>
              {okMsg && <p className="ok">{okMsg}</p>}
              {msg && !okMsg && <p className="error">{msg}</p>}
            </form>
          )}
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
