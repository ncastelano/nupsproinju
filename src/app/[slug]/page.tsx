import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ShareMenu } from "@/components/ShareMenu";
import { AppShell } from "@/components/AppShell";
import { AcompCard, FiscCard, MiniCard, brDate } from "@/components/ProcessCards";
import { cleanSlug, findBySlug, professionOf } from "@/lib/profiles";
import { getMember } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FORM_KEY } from "@/lib/forms";
import { FISC_KEY } from "@/lib/fisc";
import { NOTA_KEY } from "@/lib/notes";
import { metaOf } from "@/lib/records";

export const dynamic = "force-dynamic";
const LIMIT = 4;
const latest = (...iso: (string | undefined)[]) => iso.filter(Boolean).sort().pop();

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await findBySlug(cleanSlug((await params).slug));
  return { title: p ? `${p.name} · Núcleo Psicossocial PROINJU` : "Perfil não encontrado" };
}

type Sec = "cadastros" | "acompanhamentos" | "fiscalizacoes" | "notas";

// Perfil da pessoa: foto, nome e registro. Para quem está logado aparece dentro do sistema (com as abas),
// com os relatórios dela separados por tipo; visitantes veem só o cartão público.
export default async function ProfilePage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ ver?: string }> }) {
  const slug = cleanSlug((await params).slug);
  const p = await findBySlug(slug);
  if (!p) notFound();
  const { ver } = await searchParams;
  const only = (["cadastros", "acompanhamentos", "fiscalizacoes", "notas"] as const).find((k) => k === ver);

  const viewer = await getMember();
  const inside = !!viewer && viewer.status === "approved";
  const mine = inside && viewer!.id === p.id;

  let cad: { id: string; processo: string; nome: string; last: string; draft: boolean }[] = [];
  let acomps: { rid: string; n: number; processo: string; nome: string; last: string; draft: boolean }[] = [];
  let fiscs: { id: string; unit: string; date: string; last: string; draft: boolean }[] = [];
  let notas: { id: string; title: string; vis: string; at: string }[] = [];

  if (inside) {
    const admin = createAdminClient();
    const [all, fis, nts] = await Promise.all([
      admin.from("intake_records").select("id, created_by, created_at, nomes:answers->nomes->>value, processo:answers->processo->>value, meta:answers->_meta")
        .eq("form_key", FORM_KEY).order("created_at", { ascending: false }),
      admin.from("intake_records").select("id, created_by, created_at, answers").eq("form_key", FISC_KEY).eq("created_by", p.id).order("created_at", { ascending: false }),
      admin.from("intake_records").select("id, created_at, titulo:answers->titulo->>value, vis:answers->visibilidade->>value, upd:answers->atualizada->>value")
        .eq("form_key", NOTA_KEY).eq("created_by", p.id).order("created_at", { ascending: false }),
    ]);

    for (const r of all.data ?? []) {
      const m = metaOf({ _meta: r.meta ?? {} });
      const processo = (r.processo as string) ?? "", nome = (r.nomes as string) ?? "";
      if (r.created_by === p.id && (mine || !m.draft)) {
        cad.push({
          id: r.id as string, processo, nome, draft: !!m.draft,
          last: latest(r.created_at as string, ...m.history.filter((h) => !h.doc || h.doc === "inicial").map((h) => h.at))!,
        });
      }
      for (const a of m.acomps) {
        if (a.by_id !== p.id || (a.draft && !mine)) continue;
        acomps.push({
          rid: r.id as string, n: a.n, processo, nome, draft: !!a.draft,
          last: latest(a.at, ...m.history.filter((h) => h.doc === `acomp:${a.n}`).map((h) => h.at))!,
        });
      }
    }
    acomps.sort((a, b) => b.last.localeCompare(a.last));

    for (const r of fis.data ?? []) {
      const ans = (r.answers ?? {}) as Record<string, unknown>;
      const m = metaOf(ans);
      const v = m.visit;
      const done = v?.status === "realizada";
      if (!done && !(mine && v?.draft)) continue;
      fiscs.push({
        id: r.id as string, unit: v?.unit ?? "", date: v?.date ?? "", draft: !done,
        last: latest(v?.responded_at, r.created_at as string, ...m.history.filter((h) => !h.doc || h.doc === "fisc").map((h) => h.at))!,
      });
    }

    notas = (nts.data ?? [])
      .filter((r) => mine || r.vis === "perfil")
      .map((r) => ({ id: r.id as string, title: (r.titulo as string) || "Nota sem título", vis: (r.vis as string) === "perfil" ? "perfil" : "privado", at: (r.upd as string) || (r.created_at as string) }));
  }

  const first = p.name.split(" ")[0];
  const section = (k: Sec, title: string, count: number, body: React.ReactNode, empty: string) => {
    if (only && only !== k) return null;
    return (
      <section key={k} className="grid" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="section" style={{ margin: 0 }}>{title} ({count})</h2>
          {!only && count > LIMIT && <Link href={`/${slug}?ver=${k}`} className="see-all">Ver todos ({count})</Link>}
          {only && <Link href={`/${slug}`} className="see-all">Voltar ao perfil</Link>}
        </div>
        {count === 0 ? <div className="card empty"><p>{empty}</p></div> : <div className="user-grid four">{body}</div>}
      </section>
    );
  };
  const cut = <T,>(l: T[]) => (only ? l : l.slice(0, LIMIT));

  const header = (
    <div className="card grid" style={{ gap: 14 }}>
      <div className="grid" style={{ gap: 10, textAlign: "center", justifyItems: "center" }}>
        <Avatar url={p.avatarUrl} size={inside ? 96 : 112} onLight />
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
      {!inside && (
        <div style={{ textAlign: "center", fontSize: 14 }}>
          <Link href="/login">Entrar no sistema</Link>
        </div>
      )}
    </div>
  );

  if (!inside) {
    return (
      <div className="login-wrap">
        <section className="login-brand">
          <h1>Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho/RO</h1>
          <p>{professionOf(p.registry)}</p>
        </section>
        <section className="login-form"><div style={{ width: "100%", maxWidth: 460 }}>{header}</div></section>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="grid" style={{ gap: 16 }}>
        {!only && header}
        {only && <h1 style={{ margin: "8px 0 0" }}>{mine ? "Meus" : `Relatórios de ${first}:`} {({ cadastros: "cadastros iniciais", acompanhamentos: "acompanhamentos", fiscalizacoes: "fiscalizações", notas: "notas" })[only]}</h1>}

        {section("cadastros", "CADASTROS INICIAIS", cad.length, cut(cad).map((r) => (
          <MiniCard
            key={r.id} href={r.draft ? `/cadastro-inicial?rascunho=${r.id}` : `/cadastrados/${r.id}/documento`}
            title={`Processo ${r.processo || "—"}`} line={r.nome || "(sem nome)"} sub={`Último relatório: ${brDate(r.last)}`} draft={r.draft}
          />
        )), "Nenhum cadastro inicial.")}

        {section("acompanhamentos", "ACOMPANHAMENTOS", acomps.length, cut(acomps).map((a) => (
          <AcompCard key={`${a.rid}-${a.n}`} recordId={a.rid} nomes={a.nome} processo={a.processo} n={a.n} last={a.last} draft={a.draft} />
        )), "Nenhum acompanhamento.")}

        {section("fiscalizacoes", "FISCALIZAÇÕES", fiscs.length, cut(fiscs).map((f) => (
          <FiscCard key={f.id} id={f.id} unit={f.unit} date={f.date} last={f.last} draft={f.draft} />
        )), "Nenhuma fiscalização.")}

        {section("notas", mine ? "BLOCO DE NOTAS" : "NOTAS", notas.length, cut(notas).map((n) => (
          <MiniCard
            key={n.id} href={mine ? `/bloco-de-notas?n=${n.id}` : `/bloco-de-notas/${n.id}`}
            title={n.title} line={`Atualizada em ${brDate(n.at)}`}
            tag={mine ? (n.vis === "perfil" ? "No perfil" : "Só para mim") : undefined}
          />
        )), mine ? "Você ainda não tem notas." : "Nenhuma nota aparece neste perfil.")}
      </div>
    </AppShell>
  );
}
