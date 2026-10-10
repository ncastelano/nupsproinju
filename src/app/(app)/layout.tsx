import type { ReactNode } from "react";
import { requireMember } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  return (
    <>
      <Topbar name={m.name || m.email} />
      <div className="container">{children}</div>
    </>
  );
}
