/*
 * Rondo route layout (server component). Self-hosts the display type via
 * next/font at build time so it is pixel-correct without a runtime external
 * fetch (CSP-safe, unlike an @import). Exposes each family as a CSS variable the
 * scoped rondo-kit.css consumes. The Pitchside design system runs on
 * Space Grotesk + JetBrains Mono.
 */
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { NativeBoot } from "@/components/rondo/native-boot";

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

// Apply the persisted theme before paint so there's no light→dark flash. The
// matching `theme-color` meta goes in at the same moment, otherwise the mobile
// browser chrome renders from the root layout's `prefers-color-scheme` rule and
// visibly corrects itself once React mounts and `applyTheme` runs.
const THEME_BOOT = `try{var t=localStorage.getItem('rk-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);var m=document.createElement('meta');m.name='theme-color';m.setAttribute('data-rk','');m.content=t==='dark'?'#1b231e':'#f2f4f1';document.head.appendChild(m);}}catch(e){}`;

export default function RondoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spaceGrotesk.variable} ${jbMono.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <NativeBoot />
      {children}
    </div>
  );
}
