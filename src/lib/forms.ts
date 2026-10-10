export type QuestionType = "text" | "textarea" | "date" | "select" | "radio" | "radio_other";

export type Question = {
  id: string;
  key: string;
  position: number;
  section: string;
  label: string;
  help: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  active: boolean;
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  date: "Data",
  select: "Lista (escolher uma)",
  radio: "Seleção (ex.: Sim / Não)",
  radio_other: "Seleção com opção “Outro”",
};

export const FORM_KEY = "cadastro_inicial";
export const OTHER_PREFIX = "Outro: ";
