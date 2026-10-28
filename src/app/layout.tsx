import type { Metadata } from "next";
import { Pwa } from "@/components/pwa";
import { installation } from "@/config/installation";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
export const metadata: Metadata = {
  title: {
    default: `${installation.restaurant.name} — Delivery propio`,
    template: `%s / ${installation.restaurant.name}`,
  },
  description:
    "Delivery propio para restaurantes de El Salvador. Base de desarrollo, fase 1.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: installation.restaurant.name,
    statusBarStyle: "black-translucent",
  },
  icons: { icon: "/icon.svg", apple: "/icons/app-192.png" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-SV">
      <body>
        <a className="skip" href="#main">
          Saltar al contenido
        </a>
        {children}
        <Pwa />
      </body>
    </html>
  );
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};
