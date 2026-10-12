import { Suspense, type ReactNode } from "react";
import { requireMember } from "@/lib/auth";
import { NavTabs } from "@/components/NavTabs";
import { NavProgress } from "@/components/NavProgress";
import { ensureSlug } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";

// O cabeçalho do sistema são as próprias abas (rolam para o lado no celular).
export async function AppShell({ children }: { children: ReactNode }) {
  const m = await requireMember();
  const profileslug = await ensureSlug({ id: m.id, name: m.name, email: m.email, profileslug: m.profileslug });

  // administradores: quantos pedidos de acesso estão aguardando
  let pending = 0;
  if (m.role === "admin") {
    const { count } = await createAdminClient().from("members").select("id", { count: "exact", head: true }).eq("status", "pending");
    pending = count ?? 0;
  }

  return (
    <>
      <Suspense fallback={null}><NavProgress /></Suspense>
      <NavTabs userId={m.id} isAdmin={m.role === "admin"} slug={profileslug} pending={pending} />
      <div className="container grid" style={{ gap: 16 }}>
        {children}
      </div>
    </>
  );
}
