import Link from "next/link";
import { notFound } from "next/navigation";
import { FolderOpen } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ShareMenu } from "@/components/ShareMenu";
import { cleanSlug, findBySlug, professionOf } from "@/lib/profiles";
import { getMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FORM_KEY } from "@/lib/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await findBySlug(cleanSlug((await params).slug));
  return { title: p ? `${p.name} · Núcleo Psicossocial VPIJ Porto Velho` : "Perfil não encontrado" };
}

// Perfil da pessoa. Público: nome, foto e registro. Os cadastros só aparecem
// para a própria pessoa (e para o administrador), nunca para visitantes.
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = cleanSlug((await params).slug);
  const p = await findBySlug(slug);
  if (!p) notFound();

  const viewer = await getMember();
  const canSeeRecords = !!viewer && viewer.status === "approved" && (viewer.id === p.id || viewer.role === "admin");

  let records: { id: string; nome: string; processo: string }[] = [];
  if (canSeeRecords) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("intake_records").select("id, answers")
      .eq("form_key", FORM_KEY).eq("created_by", p.id).order("created_at", { ascending: false });
    records = (data ?? []).map((r) => {
      const a = r.answers as Record<string, { value: string }>;
      return { id: r.id as string, nome: a.nomes?.value ?? "(sem nome)", processo: a.processo?.value ?? "" };
    });
  }

  return (
    <div className="login-wrap">
      <section className="login-brand">
        <h1>Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho</h1>
        <p>{professionOf(p.registry)}</p>
      </section>
      <section className="login-form">
        <div className="card grid" style={{ gap: 14, width: "100%", maxWidth: 460 }}>
          <div className="grid" style={{ gap: 10, textAlign: "center", justifyItems: "center" }}>
            <Avatar url={p.avatarUrl} size={112} onLight />
            <div>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              {p.registry && <span style={{ color: "var(--muted)" }}>{p.registry}</span>}
            </div>
            <ShareMenu path={`/${slug}`} text={`Perfil de ${p.name} no Núcleo Psicossocial (VPIJ Porto Velho):`} className="ghost" />
          </div>

          {canSeeRecords && (
            <div className="grid" style={{ gap: 8 }}>
              <strong>
                {viewer!.id === p.id ? "Meus formulários" : `Formulários de ${p.name.split(" ")[0]}`} ({records.length})
              </strong>
              {records.length === 0 && <span style={{ color: "var(--muted)" }}>Nenhum formulário ainda.</span>}
              {records.slice(0, 8).map((r) => (
                <Link key={r.id} href={`/cadastrados/${r.id}`} className="mini-rec dark">
                  <FolderOpen size={16} />
                  <span><strong>{r.nome}</strong>{r.processo ? ` · Proc. ${r.processo}` : ""}</span>
                </Link>
              ))}
              <Link href={`/usuarios/${p.id}`}><button type="button" className="ghost">Ver todos os meus formulários</button></Link>
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 14 }}>
            {viewer ? <Link href="/cadastrar-pessoa">Voltar ao sistema</Link> : <Link href="/login">Entrar no sistema</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
