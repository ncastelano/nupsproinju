"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Share2 } from "lucide-react";

function Facebook({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1z" />
    </svg>
  );
}

// Compartilhar um endereço: WhatsApp, Facebook ou copiar o link.
export function ShareMenu({
  path, text, label = "Compartilhar", className = "light", note,
}: { path: string; text: string; label?: string; className?: string; note?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setUrl(window.location.origin + path); }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  return (
    <div className="share" ref={ref}>
      <button type="button" className={className} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Share2 size={18} /> {label}
      </button>
      {open && (
        <div className="share-pop" role="menu">
          <a role="menuitem" target="_blank" rel="noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}>
            <MessageCircle size={18} /> WhatsApp
          </a>
          <a role="menuitem" target="_blank" rel="noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}>
            <Facebook size={18} /> Facebook
          </a>
          <button type="button" role="menuitem" onClick={copy}>
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Link copiado" : "Copiar link"}
          </button>
          <div className="share-url">{url}</div>
          {note && <div className="share-note">{note}</div>}
        </div>
      )}
    </div>
  );
}
