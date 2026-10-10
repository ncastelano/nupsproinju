"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Volta para a página anterior; se a pessoa chegou direto pelo link, vai para a lista.
export function BackButton({ fallback = "/processos", label = "Voltar" }: { fallback?: string; label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="ghost"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
