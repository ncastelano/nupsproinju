import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Núcleo Psicossocial | Vara de Proteção à Infância e Juventude de Porto Velho",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
