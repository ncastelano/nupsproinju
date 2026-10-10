import { FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="card empty" style={{ marginTop: 16 }}>
      <div className="ico"><FileText size={44} /></div>
      <h2>Os campos entram aqui</h2>
      <p>Esta é a página principal. Mande os campos do formulário e eu monto.</p>
    </div>
  );
}
