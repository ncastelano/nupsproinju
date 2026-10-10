"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A página nova sobe de baixo (empurrada pelo perfil que recolhe).
export function PageTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  return <div key={path} className="page-in">{children}</div>;
}
