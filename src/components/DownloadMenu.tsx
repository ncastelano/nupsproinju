"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText } from "lucide-react";

// Baixar o relatório em Word (.docx) ou PDF.
export function DownloadMenu({ href, className = "ghost" }: { href: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pdf = `${href}${href.includes("?") ? "&" : "?"}formato=pdf`;
  return (
    <div className="share" ref={ref}>
      <button type="button" className={className} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Download size={16} /> Baixar <ChevronDown size={14} />
      </button>
      {open && (
        <div className="share-pop" role="menu">
          <a href={href} role="menuitem" onClick={() => setOpen(false)}><FileText size={16} /> Word (.docx)</a>
          <a href={pdf} role="menuitem" onClick={() => setOpen(false)}><FileText size={16} /> PDF</a>
        </div>
      )}
    </div>
  );
}
