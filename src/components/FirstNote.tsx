"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createNote } from "@/app/(app)/bloco-de-notas/actions";

// Cria a primeira nota da pessoa (uma vez) e abre o editor.
export function FirstNote() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    createNote().then((id) => router.replace(`/bloco-de-notas?n=${id}`)).catch(() => { done.current = false; });
  }, [router]);
  return <div className="card empty"><Loader2 className="spin" /> <p>Abrindo o editor...</p></div>;
}
