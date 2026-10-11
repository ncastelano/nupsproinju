"use client";
import { useRouter } from "next/navigation";

// Escolhe o processo do acompanhamento (a página recarrega com a avaliação anterior desse processo).
export function ProcessPicker({ options, value }: { options: { id: string; label: string }[]; value: string }) {
  const router = useRouter();
  return (
    <select value={value} onChange={(e) => router.push(e.target.value ? `/acompanhamento?processo=${e.target.value}` : "/acompanhamento")}>
      <option value="">Selecione o processo...</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
