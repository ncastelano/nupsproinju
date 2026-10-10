import { redirect } from "next/navigation";
import { getMember } from "@/lib/auth";
import { logout } from "../login/actions";
import { Brand } from "@/components/Brand";

export default async function AcessoPage() {
  const m = await getMember();
  if (!m) redirect("/login");
  if (m.status === "approved") redirect("/");
  const rejected = m.status === "rejected";

  return (
    <div className="login-wrap">
      <Brand />
      <section className="login-form">
        <div className="card grid" style={{ gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>{rejected ? "🚫" : "⏳"}</div>
          <h2 style={{ margin: 0 }}>{rejected ? "Acesso recusado" : "Aguardando aprovação"}</h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {rejected
              ? "O administrador não liberou o acesso para este cadastro. Em caso de dúvida, fale com o núcleo."
              : "Seu pedido foi enviado ao administrador. Assim que for aceito, você entra direto na página principal."}
          </p>
          <form action={logout}><button className="ghost">Sair</button></form>
        </div>
      </section>
    </div>
  );
}
