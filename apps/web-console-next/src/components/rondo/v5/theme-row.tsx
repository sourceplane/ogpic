/*
 * ThemeRow — the v5 Appearance control: a System / Light / Dark segmented
 * picker that writes through to `../theme` (localStorage + `data-theme` on the
 * document root), which is what every `--rk-*` token in styles/rondo-kit.css
 * keys off. Shared by MProfile and PProfile so both roles get the same control
 * from one implementation.
 *
 * The stored choice is read in an effect rather than during render: the server
 * pass has no localStorage, so seeding state from it directly would hydrate
 * with a mismatched highlight. The theme itself is applied before paint by the
 * inline boot script in app/rondo/layout.tsx, so there is no flash either way —
 * this only syncs which segment reads as selected.
 */
"use client";

import * as React from "react";
import { applyTheme, getStoredTheme, type Theme } from "../theme";
import { C5, ink, MONO } from "./kit5";

const OPTIONS: { key: Theme; label: string; sub: string }[] = [
  { key: "system", label: "Auto", sub: "MATCH DEVICE" },
  { key: "light", label: "Light", sub: "DAY PITCH" },
  { key: "dark", label: "Dark", sub: "NIGHT PITCH" },
];

export function ThemeRow() {
  const [theme, setTheme] = React.useState<Theme>("system");
  React.useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function pick(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div style={{ borderRadius: 14, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C5.ink }}>Appearance</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.4) }}>THEME</span>
      </div>
      <div role="radiogroup" aria-label="Appearance" style={{ marginTop: 10, display: "flex", gap: 8 }}>
        {OPTIONS.map((o) => {
          const on = theme === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(o.key)}
              className="rk-press"
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                background: on ? C5.panel : C5.surface,
                border: `1.5px solid ${on ? C5.ink : ink(0.11)}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: C5.ink }}>{o.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.48) }}>{o.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
