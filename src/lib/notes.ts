// Bloco de notas: documentos .docx livres de cada pessoa.
export const NOTA_KEY = "nota";
export type NoteVis = "publico" | "servico";
// valores antigos ("privado", "perfil") passam a "servico"
export const noteVis = (v: unknown): NoteVis => (v === "publico" ? "publico" : "servico");
