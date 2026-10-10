import Link from "next/link";
import { requireMember } from "@/lib/auth";

export default async function Home() {
  const m = await requireMember();
  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="hero">
        <h1>Olá, {m.name || m.email}</h1>
        <p>
          Bem-vindo(a) ao sistema do Núcleo Psicossocial da Vara de Proteção à Infância e Juventude
          de Porto Velho.
        </p>
      </section>

      <div className="cards">
        <Link href="/formulario" className="tile">
          <div className="ico">📝</div>
          <h3>Formulário</h3>
          <p>Preencher e enviar um novo registro.</p>
        </Link>
        <Link href="/banco-de-dados" className="tile">
          <div className="ico">🗂️</div>
          <h3>Banco de dados</h3>
          <p>Consultar os registros já existentes.</p>
        </Link>
        <Link href="/perfil" className="tile">
          <div className="ico">👤</div>
          <h3>Meu perfil</h3>
          <p>Seus dados e senha de acesso.</p>
        </Link>
        {m.role === "admin" && (
          <Link href="/usuarios" className="tile">
            <div className="ico">🛡️</div>
            <h3>Usuários</h3>
            <p>Aprovar pedidos e gerenciar quem tem acesso.</p>
          </Link>
        )}
      </div>
    </div>
  );
}
