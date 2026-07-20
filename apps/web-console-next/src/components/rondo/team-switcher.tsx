/*
 * TeamSwitcher — the team-selection sheet. A player/manager can belong to
 * several squads; this lists them (current one marked) and switches between
 * them, plus shortcuts to create or join another. Opened from the app header's
 * "{team} ▾". Presentational — the host wires the list + actions (live org list
 * on the authenticated route; a stub in the demo).
 */
"use client";

import * as React from "react";
import { C, ink, green, Icon } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type TeamNav = {
  teams: { slug: string; name: string; crest: string; role?: string | undefined }[];
  currentSlug?: string | undefined;
  onSelect: (slug: string) => void;
  onCreate: () => void;
  onJoin: () => void;
};

export function TeamSwitcher({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: TeamNav }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,21,17,.35)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rk-anim-rise"
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "80dvh", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 16px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>Your squads</div>
        <div style={{ fontSize: 12.5, color: ink(0.55), marginTop: 2 }}>Switch squad, or start / join another.</div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {nav.teams.map((t) => {
            const current = t.slug === nav.currentSlug;
            return (
              <div
                key={t.slug}
                onClick={() => (current ? onClose() : nav.onSelect(t.slug))}
                className="rk-press"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, background: C.card, border: `1.5px solid ${current ? C.green : ink(0.1)}` }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 13, background: green(0.12), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 17, color: C.green }}>{t.crest}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.45), marginTop: 2 }}>{current ? "CURRENT SQUAD" : "TAP TO SWITCH"}</div>
                </div>
                {current && <Icon name="check" size={18} color={C.green} stroke={3} />}
              </div>
            );
          })}
          {nav.teams.length === 0 && (
            <div style={{ textAlign: "center", padding: 16, fontSize: 13, color: ink(0.5) }}>You&rsquo;re not in a squad yet.</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={nav.onJoin} className="rk-press" style={{ flex: 1, height: 50, borderRadius: 14, background: C.card, border: `1px solid ${ink(0.14)}`, color: C.ink, fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Join a squad</button>
          <button onClick={nav.onCreate} className="rk-press" style={{ flex: 1, height: 50, borderRadius: 14, background: C.green, border: "none", color: C.onDark, fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Create a team</button>
        </div>
      </div>
    </div>
  );
}
