/*
 * TeamSelectScreen — the initial team selection (canvas 2a language). After
 * sign-in a member picks which squad to open, or starts / joins another. Built
 * from the design's squad row (the Join "recent invites" card) plus the Start
 * screen's create / join cards. Presentational — the entry page supplies the
 * live org list + actions.
 */
"use client";

import * as React from "react";
import { C, ink, PhoneShell, StatusBar, ScreenBody, Icon } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type SelectTeam = { slug: string; name: string };

function crestOf(name: string) {
  return (name.trim()[0] ?? "R").toUpperCase();
}

export function TeamSelectScreen({
  teams,
  onOpen,
  onCreate,
  onJoin,
}: {
  teams: SelectTeam[];
  onOpen: (slug: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <PhoneShell>
      <StatusBar />
      <div style={{ padding: "22px 26px 0" }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, color: C.ink, lineHeight: 1.15 }}>Your squads</div>
        <div style={{ marginTop: 8, fontSize: 13.5, color: ink(0.55) }}>Pick a squad to open, or start / join another.</div>
      </div>

      <ScreenBody style={{ padding: "20px 24px 26px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {teams.map((t) => (
            <div
              key={t.slug}
              onClick={() => onOpen(t.slug)}
              className="rk-press"
              style={{ borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13 }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: C.onDark }}>{crestOf(t.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.5), marginTop: 2 }}>OPEN SQUAD</div>
              </div>
              <Icon name="chevronRight" size={16} color={ink(0.35)} stroke={2.2} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 4px" }}>
          <div style={{ flex: 1, height: 1, background: ink(0.12) }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: ink(0.4) }}>OR START ANOTHER</span>
          <div style={{ flex: 1, height: 1, background: ink(0.12) }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {/* create — manager */}
          <div onClick={onCreate} className="rk-press" style={{ borderRadius: 22, background: C.green, padding: "22px 22px", color: C.onDark, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -40, top: -40, width: 140, height: 140, border: "2px solid rgba(242,244,241,.18)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", right: 0, top: 0, width: 70, height: 70, border: "2px solid rgba(242,244,241,.14)", borderRadius: "50%" }} />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, padding: "4px 9px", borderRadius: 10, background: "rgba(242,244,241,.16)" }}>YOU&rsquo;LL BE THE MANAGER</span>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginTop: 12 }}>Create a team</div>
            <div style={{ fontSize: 12.5, color: "rgba(242,244,241,.75)", lineHeight: 1.45, marginTop: 6, maxWidth: 250 }}>Name your club, set the format, invite players.</div>
            <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 20, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 700 }}>Set up my club →</div>
          </div>
          {/* join — player */}
          <div onClick={onJoin} className="rk-press" style={{ borderRadius: 22, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "22px 22px" }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, padding: "4px 9px", borderRadius: 10, background: ink(0.07), color: ink(0.6) }}>YOU&rsquo;LL JOIN AS A PLAYER</span>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginTop: 12, color: C.ink }}>Join with a code</div>
            <div style={{ fontSize: 12.5, color: ink(0.55), lineHeight: 1.45, marginTop: 6, maxWidth: 250 }}>Got an invite from your captain? Enter the code.</div>
            <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 20, border: `1.5px solid ${C.ink}`, color: C.ink, fontSize: 13, fontWeight: 700 }}>Enter code →</div>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "22px 0 0", fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>YOU CAN BE IN SEVERAL SQUADS AT ONCE</div>
      </ScreenBody>
    </PhoneShell>
  );
}
