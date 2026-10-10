import type { ReactNode } from "react";

export const metadata = { title: "NUPS Pro Injur" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f7f9", color: "#111" }}>
        <main style={{ maxWidth: 880, margin: "0 auto", padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
