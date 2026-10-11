import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ShareMenu } from "@/components/ShareMenu";
import { AppShell } from "@/components/AppShell";
import { cleanSlug, findBySlug, professionOf } from "@/lib/profiles";
import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await findBySlug(cleanSlug((await params).slug));
  return { title: p ? `${p.name} · Núcleo Psicossocial PROINJU` : "Perfil não encontrado" };
}

// Perfil da pessoa: foto, nome e registro. Para quem está logado aparece dentro do sistema (com as abas);
// visitantes veem só o cartão público.
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = cleanSlug((await params).slug);
  const p = await findBySlug(slug);
  if (!p) notFound();

  const viewer = await getMember();
  const inside = !!viewer && viewer.status === "approved";
  const mine = inside && viewer!.id === p.id;

  // relatórios mais recentes da pessoa (qualquer pessoa com conta pode ver)
  let recent: { id: string; processo: string; nome: string }[] = [];
  let total = 0;
  if (inside) {
    const { data } = await createAdminClient().from("intake_records")
      .select("id, nomes:answers->nomes->>value, processo:answers->processo->>value, meta:answers->_meta")
      .eq("form_key", FORM_KEY).eq("created_by", p.id).order("created_at", { ascending: false });
    const list = (data ?? []).filter((r) => !(r.meta as { draft?: boolean } | null)?.draft);
    total = list.length;
    recent = list.slice(0, 4).map((r) => ({ id: r.id as string, processo: (r.processo as string) ?? "", nome: (r.nomes as string) ?? "" }));
  }

  const card = (
    <div className="card grid" style={{ gap: 14, width: "100%", maxWidth: 560, margin: inside ? "0" : undefined }}>
      <div className="grid" style={{ gap: 10, textAlign: "center", justifyItems: "center" }}>
        <Avatar url={p.avatarUrl} size={112} onLight />
        <div>
          <h2 style={{ margin: 0 }}>{p.name}</h2>
          {p.registry && <div style={{ color: "var(--muted)" }}>{p.registry}</div>}
          {professionOf(p.registry) && <div style={{ color: "var(--muted)", fontSize: 14 }}>{professionOf(p.registry)}</div>}
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <ShareMenu path={`/${slug}`} text={`Perfil de ${p.name} no Núcleo Psicossocial (PROINJU):`} className="ghost" />
          {mine && <Link href="/editar-perfil"><button type="button" className="ghost"><Pencil size={16} /> Editar perfil</button></Link>}
        </div>
      </div>

      {inside && (
        <div className="grid" style={{ gap: 8 }}>
          <strong>Relatórios {mine ? "meus" : `de ${p.name.split(" ")[0]}`} ({total})</strong>
          {recent.length === 0 && <span style={{ color: "var(--muted)" }}>Nenhum relatório ainda.</span>}
          {recent.map((r) => (
            <Link key={r.id} href={`/cadastrados/${r.id}/documento`} className="mini-rec dark">
              <span><strong>Processo {r.processo || "—"}</strong>{r.nome ? ` · ${r.nome}` : ""}</span>
            </Link>
          ))}
          <Link href={mine ? "/processos" : `/usuarios/${p.id}`}><button type="button" className="ghost">Ver todos os relatórios</button></Link>
        </div>
      )}

      {!inside && (
        <div style={{ textAlign: "center", fontSize: 14 }}>
          <Link href="/login">Entrar no sistema</Link>
        </div>
      )}
    </div>
  );

  if (inside) return <AppShell>{card}</AppShell>;

  return (
    <div className="login-wrap">
      <section className="login-brand">
        <h1>Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho/RO</h1>
        <p>{professionOf(p.registry)}</p>
      </section>
      <section className="login-form">{card}</section>
    </div>
  );
}
