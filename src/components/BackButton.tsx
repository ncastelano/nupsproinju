"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ label = "Voltar" }: { label?: string }) {
  const router = useRouter();
  return (
    <button type="button" className="ghost" onClick={() => router.back()}>
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
