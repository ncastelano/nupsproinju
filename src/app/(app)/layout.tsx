import type { ReactNode } from "react";
import { requireMember } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireMember();
  return <>{children}</>;
}
