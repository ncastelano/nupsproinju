"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { importProcess } from "@/app/(app)/usuarios/[id]/import-actions";

// Botão pequeno: escolhe o arquivo e já exporta (CSV da planilha, .docx, .pdf ou .txt).
export function ExportButton({ kind }: { kind: "formulario" | "acompanhamento" }) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onPick(file?: File) {
    if (!file) return;
    setMsg(null);
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", file);
    start(async () => {
      const r = await importProcess(null, fd);
      if (r === "ok") setMsg({ ok: true, text: "Arquivo exportado." });
      else if (r?.startsWith("ok:")) setMsg({ ok: true, text: r.slice(3) });
      else setMsg({ ok: false, text: r ?? "Não foi possível exportar." });
      if (ref.current) ref.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="export-wrap">
      <input ref={ref} type="file" accept=".csv,.docx,.pdf,.txt,.md" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      <button type="button" className="ghost small" disabled={pending} onClick={() => ref.current?.click()}>
        <Upload size={14} /> {pending ? "Exportando..." : "Exportar arquivo"}
      </button>
      {msg && <span className={msg.ok ? "export-ok" : "export-err"}>{msg.text}</span>}
    </div>
  );
}
