import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Gestión Clínica Dental", template: "%s · Gestión Clínica Dental" },
  description: "Gestión y análisis de rentabilidad de servicios odontológicos",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#147f71" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PE">
      <body>{children}</body>
    </html>
  );
}
