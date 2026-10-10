import { FileText } from "lucide-react";
export default function FormularioPage() {
  return (
    <div className="grid" style={{ gap: 16 }}>
      <h1 style={{ margin: "8px 0 0" }}>Formulário</h1>
      <div className="card empty">
        <div className="ico"><FileText size={44} /></div>
        <h2>Em construção</h2>
        <p>Aqui entram os campos do formulário do núcleo. É o próximo passo.</p>
      </div>
    </div>
  );
}
