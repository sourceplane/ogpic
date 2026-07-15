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

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    if (theme === "system") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}

/** Apply the persisted theme (call once on app mount). */
export function initTheme(): void {
  applyTheme(getStoredTheme());
}
