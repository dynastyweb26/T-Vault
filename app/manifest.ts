import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "T-Vault",
    short_name: "T-Vault",
    description: "Mobile-first back-office toolkit for truck owner-operators.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1C1C1E",
    theme_color: "#1C1C1E",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icon.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
