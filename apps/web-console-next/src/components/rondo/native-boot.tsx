/*
 * NativeBoot — a render-null client component mounted once in the Rondo route
 * layout. It applies native-shell setup that should span every Rondo page
 * (login, hub, the app): currently edge-to-edge full-screen via the Capacitor
 * StatusBar overlay. No-op in a normal browser / PWA.
 */
"use client";

import { useFullscreen } from "./v5/native5";

export function NativeBoot(): null {
  useFullscreen();
  return null;
}
