export type AcolhimentoRow = {
  id: string;
  created_at: string;
  process_number: string;
  children_names: string;
  children_birthdates: string;
  mother_name: string; mother_address: string; mother_contact: string;
  father_name: string; father_address: string; father_contact: string;
  reception_date: string;
  tutelary_council: string;
  modality: string;
  unit_name: string;
  has_related_processes: "sim" | "nao" | "nao_verificado";
  related_processes: string;
  procedures: string;
  extra_answers?: { label: string; value: string }[];
};

const fmt = (d: string) => (d ? d.split("-").reverse().join("/") : "");

function parent(label: string, name: string, address: string, contact: string) {
  if (!name && !address && !contact) return null;
  const parts = [name || "nome não informado"];
  if (address) parts.push(`endereço: ${address}`);
  if (contact) parts.push(`contato: ${contact}`);
  return `${label}: ${parts.join("; ")}.`;
}

// Transforma as respostas do formulário no texto corrido do acompanhamento.
export function buildNarrative(a: AcolhimentoRow, professional: string): string {
  const out: string[] = [];
  out.push(`Processo nº ${a.process_number}.`);
  out.push(`Criança(s)/adolescente(s): ${a.children_names}. Data(s) de nascimento: ${a.children_birthdates}.`);

  const mae = parent("Genitora", a.mother_name, a.mother_address, a.mother_contact);
  const pai = parent("Genitor", a.father_name, a.father_address, a.father_contact);
  if (mae) out.push(mae);
  if (pai) out.push(pai);

  let acolhimento = `Acolhimento realizado em ${fmt(a.reception_date)}`;
  if (a.tutelary_council) acolhimento += `, com encaminhamento do Conselho Tutelar ${a.tutelary_council}`;
  acolhimento += `. Modalidade atual: ${a.modality}, na unidade/serviço ${a.unit_name}.`;
  out.push(acolhimento);

  const rel =
    a.has_related_processes === "sim"
      ? `Existem outros processos judiciais relacionados${a.related_processes ? `: ${a.related_processes}` : ""}.`
      : a.has_related_processes === "nao"
        ? "Não existem outros processos judiciais relacionados."
        : "Não foi possível verificar a existência de outros processos judiciais relacionados.";
  out.push(rel);

  const procs = a.procedures.split("\n").map((l) => l.trim()).filter(Boolean);
  out.push(`Procedimentos realizados na avaliação inicial:\n${procs.map((p) => `• ${p}`).join("\n")}`);

  for (const e of a.extra_answers ?? []) out.push(`${e.label}: ${e.value}`);

  if (professional) out.push(`Profissional responsável pelo acompanhamento: ${professional}.`);
  return out.join("\n\n");
}
