/*
 * Rondo route layout (server component). Self-hosts the display type via
 * next/font at build time so it is pixel-correct without a runtime external
 * fetch (CSP-safe, unlike an @import). Exposes each family as a CSS variable the
 * scoped rondo-kit.css consumes. The Pitchside design system runs on
 * Space Grotesk + JetBrains Mono.
 */
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jbmono",
  display: "swap",
});

export default function RondoLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${spaceGrotesk.variable} ${jbMono.variable}`}>{children}</div>;
}
