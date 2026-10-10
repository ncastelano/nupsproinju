import { Suspense, type ReactNode } from "react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header, type MyRecord } from "@/components/Header";
import { NavTabs } from "@/components/NavTabs";
import { NavProgress } from "@/components/NavProgress";
import { FORM_KEY } from "@/lib/forms";
import { ensureSlug } from "@/lib/profiles";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  const profileslug = await ensureSlug({ id: m.id, name: m.name, email: m.email, profileslug: m.profileslug });
  const supabase = await createClient();
  const { data } = await supabase
    .from("intake_records").select("id, answers")
    .eq("form_key", FORM_KEY).eq("created_by", m.id).order("created_at", { ascending: false });

  const records: MyRecord[] = (data ?? []).map((r) => {
    const a = r.answers as Record<string, { value: string }>;
    return { id: r.id as string, nome: a.nomes?.value ?? "(sem nome)", processo: a.processo?.value ?? "" };
  });

  return (
    <>
      <Suspense fallback={null}><NavProgress /></Suspense>
      <Header
        userId={m.id}
        name={m.name || m.email}
        email={m.email}
        avatarUrl={m.avatar_url ?? null}
        registry={m.registry ?? ""}
        profileslug={profileslug}
        records={records}
      />
      <div className="container grid" style={{ gap: 16 }}>
        <NavTabs userId={m.id} isAdmin={m.role === "admin"} />
        {children}
      </div>
    </>
  );
}
