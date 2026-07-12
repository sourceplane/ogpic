/*
 * Rondo route layout (server component). Self-hosts the display type via
 * next/font at build time so it is pixel-correct without a runtime external
 * fetch (CSP-safe, unlike an @import). Exposes each family as a CSS variable the
 * scoped stylesheets consume.
 *
 * The "Pitchside" v2 design system (rondo-kit.css) is built on Space Grotesk +
 * JetBrains Mono. Archivo is retained only while the legacy dark screens are
 * migrated screen-by-screen; it is removed once the revamp lands (Phase 5).
 */
import { Space_Grotesk, Archivo, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jbmono",
  display: "swap",
});

export default function RondoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spaceGrotesk.variable} ${archivo.variable} ${jbMono.variable}`}>
      {children}
    </div>
  );
}
