import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ShareMenu } from "@/components/ShareMenu";
import { cleanSlug, findBySlug } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await findBySlug(cleanSlug((await params).slug));
  return { title: p ? `${p.name} · Núcleo Psicossocial VPIJ Porto Velho` : "Perfil não encontrado" };
}

// Perfil público da pessoa: só nome, foto e registro profissional.
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = cleanSlug((await params).slug);
  const p = await findBySlug(slug);
  if (!p) notFound();

  return (
    <div className="login-wrap">
      <section className="login-brand">
        <h1>Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho</h1>
        <p>Equipe técnica</p>
      </section>
      <section className="login-form">
        <div className="card grid" style={{ gap: 14, textAlign: "center", justifyItems: "center" }}>
          <span className="avatar big-avatar"><Avatar url={p.avatarUrl} size={112} /></span>
          <div>
            <h2 style={{ margin: 0 }}>{p.name}</h2>
            {p.registry && <span style={{ color: "var(--muted)" }}>{p.registry}</span>}
          </div>
          <ShareMenu path={`/${slug}`} text={`Perfil de ${p.name} no Núcleo Psicossocial (VPIJ Porto Velho):`} className="ghost" />
          <Link href="/login" style={{ fontSize: 14 }}>Entrar no sistema</Link>
        </div>
      </section>
    </div>
  );
}
