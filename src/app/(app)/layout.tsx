import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
