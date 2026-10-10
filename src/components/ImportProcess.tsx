"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2 } from "lucide-react";
import { importProcess } from "@/app/(app)/usuarios/[id]/import-actions";

// Exportar formulário / acompanhamento: cola o link do Google Docs ou arrasta e solta o arquivo.
export function ImportProcess({ kind }: { kind: "formulario" | "acompanhamento" }) {
  const label = kind === "acompanhamento" ? "acompanhamento" : "formulário";
  const router = useRouter();
  const [msg, action, pending] = useActionState(importProcess, null);
  const [over, setOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (msg === "ok" || msg?.startsWith("ok:")) { formRef.current?.reset(); setFileName(""); router.refresh(); }
  }, [msg]); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(files: FileList | null) {
    const f = files?.[0];
    if (!f || !fileRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileRef.current.files = dt.files;
    setFileName(f.name);
  }

  return (
    <form ref={formRef} action={action} className="card grid" style={{ gap: 12 }}>
      <input type="hidden" name="kind" value={kind} />
      <div>
        <strong>Exportar {label}</strong>
        <div style={{ color: "var(--muted)" }}>
          Traga o {label} para o banco de dados: envie o CSV da planilha (cada linha vira um {label}) ou cole o link de um Google Docs.
        </div>
      </div>

      <label className="field">
        <span><Link2 size={14} style={{ verticalAlign: "-2px" }} /> Link do Google Docs</span>
        <input name="url" placeholder="https://docs.google.com/document/d/…" inputMode="url" />
      </label>

      <div
        className={`dropzone${over ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
      >
        <FileUp size={28} />
        {fileName ? (
          <>
            <strong>{fileName}</strong>
            <span>Pronto para exportar. Toque para trocar.</span>
          </>
        ) : (
          <>
            {/* computador: arrastar e soltar; celular: escolher o arquivo */}
            <strong className="only-desktop">Arraste o arquivo aqui</strong>
            <span className="only-desktop">ou clique para escolher (.csv, .docx, .pdf, .txt)</span>
            <strong className="only-touch">Escolher arquivo</strong>
            <span className="only-touch">.csv, .docx, .pdf ou .txt do seu celular</span>
          </>
        )}
        <input ref={fileRef} name="file" type="file" accept=".csv,.docx,.pdf,.txt,.md" hidden
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
      </div>

      <button disabled={pending}>{pending ? "Trazendo o documento..." : `Exportar ${label}`}</button>
      {msg === "ok" && <p className="ok">Pronto. Ele aparece em “Exportados” logo abaixo.</p>}
      {msg?.startsWith("ok:") && <p className="ok">Importado: {msg.slice(3)}</p>}
      {msg && msg !== "ok" && !msg.startsWith("ok:") && <p className="error">{msg}</p>}
    </form>
  );
}
