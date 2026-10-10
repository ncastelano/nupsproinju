import type { ReactNode } from "react";
import { requireMember } from "@/lib/auth";
import { Header } from "@/components/Header";
import { NavTabs } from "@/components/NavTabs";
import { PageTransition } from "@/components/PageTransition";
import { ensureSlug } from "@/lib/profiles";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  const profileslug = await ensureSlug({ id: m.id, name: m.name, email: m.email, profileslug: m.profileslug });
  return (
    <>
      <Header
        userId={m.id}
        name={m.name || m.email}
        email={m.email}
        avatarUrl={m.avatar_url ?? null}
        registry={m.registry ?? ""}
        profileslug={profileslug}
      />
      <div className="container grid" style={{ gap: 16 }}>
        <NavTabs userId={m.id} isAdmin={m.role === "admin"} />
        <PageTransition>{children}</PageTransition>
      </div>
    </>
  );
}
