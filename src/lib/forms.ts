export type QuestionType = "text" | "textarea" | "date" | "select" | "radio" | "radio_other" | "checkbox";

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
  checkbox: "Várias opções (marcar mais de uma)",
};

export const FORM_KEY = "cadastro_inicial";
export const FORM_ACOMP = "acompanhamento";
export const FORM_KEYS = [FORM_KEY, FORM_ACOMP] as const;
export const FORM_TITLE: Record<string, string> = {
  cadastro_inicial: "Cadastro inicial",
  acompanhamento: "Acompanhamento",
};
export const OTHER_PREFIX = "Outro: ";
