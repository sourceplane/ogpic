/*
 * native5 — small bridge to the Capacitor native shell (the Android APK).
 *
 * When the web app runs inside the Capacitor WebView, the Android hardware /
 * gesture Back fires the `@capacitor/app` `backButton` event. Without a handler
 * the app just exits — so a single Back closes the whole app instead of stepping
 * back through screens. `useNativeBack` registers a handler that drives the
 * app's own back navigation; only when nothing is left to pop does it let the
 * app exit. It is a no-op in a normal browser / PWA (there is no Capacitor), so
 * the same web build works everywhere.
 */
"use client";

import * as React from "react";

interface PluginHandle {
  remove?: () => void;
}
interface CapacitorAppPlugin {
  addListener?: (event: string, cb: () => void) => PluginHandle | Promise<PluginHandle>;
  exitApp?: () => void;
}
interface CapacitorStatusBarPlugin {
  setOverlaysWebView?: (opts: { overlay: boolean }) => Promise<void> | void;
  setStyle?: (opts: { style: string }) => Promise<void> | void;
  setBackgroundColor?: (opts: { color: string }) => Promise<void> | void;
}
interface CapacitorHapticsPlugin {
  impact?: (opts: { style: string }) => Promise<void> | void;
  selectionChanged?: () => Promise<void> | void;
}
interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    App?: CapacitorAppPlugin;
    StatusBar?: CapacitorStatusBarPlugin;
    Haptics?: CapacitorHapticsPlugin;
  };
}

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when running inside the Capacitor native shell (the Android app). */
export function useIsNative(): boolean {
  const [native, setNative] = React.useState(false);
  React.useEffect(() => setNative(!!capacitor()?.isNativePlatform?.()), []);
  return native;
}

/**
 * Draw the app edge-to-edge under the system bars (immersive full-screen) in
 * the native shell. The status bar overlays the WebView with a transparent
 * background and dark icons (the app surface is light); the Android theme makes
 * the navigation bar transparent too (see the APK workflow). Safe-area CSS
 * insets keep headers/dock clear of the bars. No-op in a browser / PWA.
 */
export function useFullscreen(): void {
  React.useEffect(() => {
    const cap = capacitor();
    if (!cap?.isNativePlatform?.()) return;
    const sb = cap.Plugins?.StatusBar;
    if (!sb) return;
    try {
      void sb.setOverlaysWebView?.({ overlay: true });
      // Style "LIGHT" = dark icons, for our light surface.
      void sb.setStyle?.({ style: "LIGHT" });
      void sb.setBackgroundColor?.({ color: "#00000000" });
    } catch {
      /* best effort — a missing StatusBar plugin just means no overlay */
    }
  }, []);
}

/**
 * A tiny haptic tick for navigation gestures (tab switch, pop, swipe-back
 * commit) — the physical feedback that makes a WebView app feel native.
 * Returns a stable no-op outside the native shell, and never throws or awaits
 * in the caller's path.
 */
export function useHaptic(): (kind?: "light" | "select") => void {
  return React.useCallback((kind: "light" | "select" = "select") => {
    const h = capacitor()?.Plugins?.Haptics;
    if (!h) return;
    try {
      if (kind === "light") void h.impact?.({ style: "LIGHT" });
      else void h.selectionChanged?.();
    } catch {
      /* haptics are cosmetic — never let them break navigation */
    }
  }, []);
}

/**
 * Register a hardware-Back handler for the native shell. `onBack` returns
 * `true` when it consumed the press (the app stays open) and `false` to let the
 * app exit (typically only at the root screen). The latest `onBack` is always
 * used, so callers can pass an inline closure over current state.
 */
export function useNativeBack(onBack: () => boolean): void {
  const ref = React.useRef(onBack);
  ref.current = onBack;

  React.useEffect(() => {
    const cap = capacitor();
    if (!cap?.isNativePlatform?.()) return;
    const app = cap.Plugins?.App;
    if (!app?.addListener) return;

    let handle: PluginHandle | undefined;
    let removed = false;
    const cb = () => {
      const consumed = ref.current();
      if (!consumed) app.exitApp?.();
    };
    const res = app.addListener("backButton", cb);
    if (res && typeof (res as Promise<PluginHandle>).then === "function") {
      void (res as Promise<PluginHandle>).then((h) => {
        if (removed) h.remove?.();
        else handle = h;
      });
    } else {
      handle = res as PluginHandle;
    }
    return () => {
      removed = true;
      handle?.remove?.();
    };
  }, []);
}
