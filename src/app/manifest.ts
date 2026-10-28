import type { MetadataRoute } from "next";
import { installation } from "@/config/installation";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${installation.restaurant.name} · Delivery`,
    short_name: installation.restaurant.name,
    description: "Pedidos directos y reparto propio de tu restaurante.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      {
        src: "/icons/app-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
