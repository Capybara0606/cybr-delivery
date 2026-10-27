import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: { default: "CYBR DELIVERY — Tu restaurante. Tu delivery.", template: "%s / CYBR DELIVERY" }, description: "Delivery propio para restaurantes de El Salvador. Base de desarrollo, fase 1.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es-SV"><body><a className="skip" href="#main">Saltar al contenido</a>{children}</body></html>; }
