/*
 * Rondo route layout (server component). Self-hosts Archivo + JetBrains Mono via
 * next/font at build time so the display type is pixel-correct without a runtime
 * external fetch (CSP-safe, unlike an @import). Exposes them as CSS variables the
 * scoped rondo.css consumes.
 */
import { Archivo, JetBrains_Mono } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jbmono",
  display: "swap",
});

export default function RondoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${archivo.variable} ${jbMono.variable}`}>{children}</div>;
}
