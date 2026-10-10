import type { ReactNode } from "react";
import { requireMember } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  return (
    <>
      <Topbar name={m.name || m.email} email={m.email} isAdmin={m.role === "admin"} />
      <div className="container">{children}</div>
    </>
  );
}
