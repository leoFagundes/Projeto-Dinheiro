import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Projeto Dinheiro",
    short_name: "Pj. Dinheiro",
    description: "Controle financeiro pessoal, simples e direto.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f7",
    theme_color: "#16a34a",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
