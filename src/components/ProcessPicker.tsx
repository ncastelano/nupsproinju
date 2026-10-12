"use client";
import { useRouter } from "next/navigation";
import { ChoiceField } from "@/components/ChoiceField";

// Escolhe o processo do acompanhamento (a página recarrega com a avaliação anterior desse processo).
export function ProcessPicker({ options, value }: { options: { id: string; label: string }[]; value: string }) {
  const router = useRouter();
  const current = options.find((o) => o.id === value);
  return (
    <ChoiceField
      key={value} name="processo_escolhido" title="Número do processo" placeholder="Selecione o processo..."
      options={options.map((o) => o.label)} initial={current ? [current.label] : []}
      onChange={(sel) => {
        const id = options.find((o) => o.label === sel[0])?.id;
        router.push(id ? `/acompanhamento?processo=${id}` : "/acompanhamento");
      }}
    />
  );
}
