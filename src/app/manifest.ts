import type { MetadataRoute } from "next";

// Instalar como aplicativo (tela cheia, ícone na tela inicial)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Núcleo Psicossocial · PROINJU",
    short_name: "NUPS PROINJU",
    description: "Sistema do Núcleo Psicossocial da Vara de Proteção à Infância e Juventude de Porto Velho/RO.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f6f7",
    theme_color: "#0b5d6b",
    lang: "pt-BR",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
