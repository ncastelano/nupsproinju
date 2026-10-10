import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const TITLE = "Núcleo Psicossocial | Vara de Proteção à Infância e Juventude de Porto Velho";
const DESCRIPTION =
  "Sistema do Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho (TJRO): formulários e acompanhamentos.";

// Endereço público (necessário para o link de compartilhamento ter a imagem com endereço completo).
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://nupsproinjur.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "NUPS Pro Injur",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Núcleo Psicossocial · VPIJ Porto Velho",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
