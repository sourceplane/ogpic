/*
 * Rondo theme control. The kit is theme-aware via CSS variables (rondo-kit.css);
 * this persists the viewer's choice and reflects it as `data-theme` on the
 * document root. "system" follows prefers-color-scheme.
 */
"use client";

export type Theme = "system" | "light" | "dark";

const KEY = "rk-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** The v11 canvas surfaces, mirrored from `--rk-surface` in rondo-kit.css.
 *  Kept as literals because `theme-color` is read by the browser chrome before
 *  a paint has resolved any custom property. */
const CHROME_TINT: Record<"light" | "dark", string> = { light: "#f2f4f1", dark: "#1b231e" };

/** Tint the mobile browser/status-bar chrome to the surface actually in use.
 *  The root layout's static `themeColor` only keys off `prefers-color-scheme`,
 *  so it goes wrong the moment a viewer forces the opposite theme — this
 *  overrides it with the resolved choice, and hands control back (by dropping
 *  the override) when they return to "system". */
function applyChromeTint(theme: Theme): void {
  const head = document.head;
  if (!head) return;
  let meta = head.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-rk]');
  if (theme === "system") {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.setAttribute("data-rk", "");
    head.appendChild(meta);
  }
  meta.content = CHROME_TINT[theme];
}

/** Event fired whenever the theme changes, so non-CSS consumers (the native
 *  status bar, which can't read a custom property) can follow along. */
export const THEME_EVENT = "rk-theme-change";

/** The theme actually in effect — resolves "system" against the OS setting. */
export function resolveTheme(theme: Theme = getStoredTheme()): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  applyChromeTint(theme);
  try {
    if (theme === "system") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT));
}

/** Apply the persisted theme (call once on app mount). */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
