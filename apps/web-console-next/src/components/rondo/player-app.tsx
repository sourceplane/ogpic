/*
 * PlayerApp — the player surface (canvas 2c) on the Pitchside v2 kit: Home
 * (availability in one tap), Rate (segment scales, one player at a time), and
 * Games (view-only fixtures + results). No scheduling, no squad admin — the
 * player role. Seed-driven for review; live data + role gating land in phase 5.
 */
"use client";

import * as React from "react";
import {
  C,
  ink,
  green,
  rust,
  PhoneShell,
  StatusBar,
  ScreenBody,
  MonoLabel,
  Avatar,
  Icon,
  MapCard,
  PitchCanvas,
  PlayerToken,
  RatingSegments,
  BottomNavPlayer,
  type PlayerTab,
} from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

type Spot = { i: string; n: string; l: string; t: string; team?: "home" | "gold" | "muted" | "you"; dim?: boolean; size?: number };
const PLAYER_XI: Spot[] = [
  { i: "RM", n: "Menon 87", l: "50%", t: "12%" },
  { i: "KB", n: "Brandt 86", l: "15%", t: "34%" },
  { i: "SO", n: "Okafor 83", l: "38%", t: "32%" },
  { i: "TN", n: "Nowak 79", l: "62%", t: "32%" },
  { i: "NK", n: "Klein 77", l: "85%", t: "34%" },
  { i: "YD", n: "You · 88", team: "you", size: 52, l: "15%", t: "58%" },
  { i: "AP", n: "Pirlo 85", team: "gold", l: "38%", t: "56%" },
  { i: "LF", n: "Fernandes 81", team: "muted", dim: true, l: "62%", t: "56%" },
  { i: "AH", n: "Hassan 80", team: "gold", l: "85%", t: "58%" },
  { i: "DC", n: "Costa 84", l: "25%", t: "81%" },
  { i: "MS", n: "Silva 91", l: "50%", t: "83%" },
  { i: "JB", n: "Berg 82", l: "75%", t: "81%" },
];

// Rate queue: rated (✓), current, upcoming, overflow.
const RATE_ROW = [
  { i: "MS", done: true },
  { i: "KB", done: true },
  { i: "RM", done: true },
  { i: "SO", done: true },
  { i: "AP", current: true },
  { i: "TN" },
  { i: "JB" },
  { i: "+4", more: true },
];
const AP_SKILLS: [string, number][] = [
  ["PACE", 3],
  ["SHOOTING", 4],
  ["PASSING", 5],
  ["DRIBBLING", 4],
  ["DEFENDING", 3],
  ["STAMINA", 4],
];
const RESULTS = [
  { d: "5 JUL", s: "4–3", r: "W" as const },
  { d: "28 JUN", s: "2–2", r: "D" as const },
  { d: "21 JUN", s: "1–2", r: "L" as const },
];

type View = "pitch" | "rate" | "games";

export function PlayerApp() {
  const [view, setView] = React.useState<View>("pitch");
  const [inSquad, setInSquad] = React.useState<boolean | null>(true);

  const nav = <BottomNavPlayer active={view as PlayerTab} rateBadge={7} onSelect={(t) => setView(t)} />;

  /* ── RATE ── */
  if (view === "rate") {
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>Rate</span>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.green }}>04 / 11</span>
        </div>
        <div style={{ padding: "6px 24px 0", fontSize: 12, color: ink(0.5) }}>Anonymous · settles when the window closes Sunday</div>
        <div style={{ padding: "14px 24px 0", display: "flex", gap: 8, overflow: "hidden" }}>
          {RATE_ROW.map((p, idx) => {
            if (p.more)
              return (
                <div key={idx} style={{ width: 40, height: 40, flex: "none", borderRadius: "50%", background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: ink(0.5) }}>
                  {p.i}
                </div>
              );
            const base: React.CSSProperties = { width: 40, height: 40, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, position: "relative" };
            if (p.current)
              return (
                <div key={idx} style={{ ...base, background: C.ink, color: C.onDark, boxShadow: `0 0 0 3px ${ink(0.15)}` }}>{p.i}</div>
              );
            if (p.done)
              return (
                <div key={idx} style={{ ...base, background: "#DDE3DC", color: ink(0.4) }}>
                  {p.i}
                  <span style={{ position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: C.green, color: "#fff", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
                </div>
              );
            return <div key={idx} style={{ ...base, background: C.card, border: `1px solid ${ink(0.14)}`, color: C.ink }}>{p.i}</div>;
          })}
        </div>

        <div style={{ flex: 1, margin: "16px 20px 0", background: C.card, border: `1px solid ${ink(0.1)}`, borderRadius: 22, padding: "26px 22px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar initials="AP" size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, color: C.ink }}>Andre Pirlo</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ink(0.5), marginTop: 2 }}>MID · 9 MATCHES TOGETHER</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 12, background: green(0.1), color: C.green }}>OVR 85</span>
          </div>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 18 }}>
            {AP_SKILLS.map(([label, val]) => (
              <RatingSegments key={label} label={label} value={val} />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="rk-press" style={{ height: 54, borderRadius: 16, background: C.ink, color: C.onDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
            Next player →
          </div>
        </div>
        {nav}
      </PhoneShell>
    );
  }

  /* ── GAMES ── */
  if (view === "games") {
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>Games</span>
        </div>
        <ScreenBody style={{ padding: "16px 24px 0" }}>
          <MonoLabel>NEXT UP</MonoLabel>
          <div style={{ marginTop: 10, borderRadius: 20, background: C.card, border: `1px solid ${ink(0.12)}`, overflow: "hidden" }}>
            <MapCard height={120} style={{ borderRadius: 0, border: "none" }} />
            <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 58, flex: "none", textAlign: "center", borderRight: `1px solid ${ink(0.1)}`, paddingRight: 12 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45) }}>SAT</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>18</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45) }}>JUL</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, color: C.ink }}>Riverside Astro</div>
                <div style={{ fontSize: 11.5, color: ink(0.55), marginTop: 2 }}>18:30 KO · Wapping Wall, E1W</div>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: C.green }}>Directions ↗</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "6px 10px", borderRadius: 12, background: green(0.12), color: C.green, flex: "none" }}>YOU&rsquo;RE IN ✓</span>
            </div>
            <div style={{ padding: "0 16px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex" }}>
                {["MS", "RM", "KB"].map((x, i) => (
                  <div key={x} style={{ width: 22, height: 22, borderRadius: "50%", background: C.avatar, border: "2px solid #fff", marginLeft: i ? -7 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: C.ink }}>{x}</div>
                ))}
              </div>
              <span style={{ fontSize: 11, color: ink(0.5) }}>9 in · 2 maybe · sides drop 1h before KO</span>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <MonoLabel>RESULTS</MonoLabel>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {RESULTS.map((g) => {
                const rc = g.r === "W" ? { bg: green(0.14), c: C.green } : g.r === "L" ? { bg: rust(0.14), c: C.rust } : { bg: ink(0.08), c: ink(0.55) };
                return (
                  <div key={g.d} style={{ borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 13 }}>
                    <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.45), width: 46 }}>{g.d}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink }}>Home vs Away</span>
                    <span style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{g.s}</span>
                    <span style={{ width: 22, height: 22, borderRadius: 7, background: rc.bg, color: rc.c, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{g.r}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, borderRadius: 14, border: `1px dashed ${ink(0.2)}`, padding: "12px 16px", fontSize: 11.5, color: ink(0.5), textAlign: "center" }}>
              Only your manager can schedule matches
            </div>
          </div>
        </ScreenBody>
        {nav}
      </PhoneShell>
    );
  }

  /* ── HOME (pitch + availability) ── */
  return (
    <PhoneShell>
      <StatusBar />
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Northside FC</span>
          <Icon name="chevronDown" size={14} color={ink(0.5)} stroke={2.4} />
        </div>
        <Avatar initials="YD" size={36} bg={C.card} ring={ink(0.14)} />
      </div>
      <div style={{ padding: "10px 24px 0", display: "flex", gap: 7 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 14, background: C.card, border: `1px solid ${ink(0.12)}`, color: C.ink }}>YOUR OVR 88</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 14, background: C.card, border: `1px solid ${ink(0.12)}`, color: C.ink }}>#4 LOCAL</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 14, background: C.green, color: C.onDark }}>W·W·W</span>
      </div>
      <PitchCanvas style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
        {PLAYER_XI.map((p) => (
          <PlayerToken key={p.i} initials={p.i} name={p.n} team={p.team ?? "home"} dimmed={p.dim} size={p.size} left={p.l} top={p.t} />
        ))}
      </PitchCanvas>
      <div style={{ margin: "12px 24px 0", borderRadius: 16, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1, color: ink(0.45) }}>SAT 18:30 · RIVERSIDE ASTRO</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 3 }}>Are you in?</div>
        </div>
        <div
          onClick={() => setInSquad(true)}
          className="rk-press"
          style={{ height: 38, padding: "0 16px", borderRadius: 19, background: inSquad ? C.green : C.card, border: inSquad ? "none" : `1px solid ${ink(0.18)}`, color: inSquad ? C.onDark : ink(0.55), fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center" }}
        >
          I&rsquo;m in ✓
        </div>
        <div
          onClick={() => setInSquad(false)}
          className="rk-press"
          style={{ height: 38, padding: "0 14px", borderRadius: 19, border: `1px solid ${inSquad === false ? C.rust : ink(0.18)}`, background: inSquad === false ? rust(0.1) : "transparent", color: inSquad === false ? C.rust : ink(0.55), fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center" }}
        >
          Out
        </div>
      </div>
      {nav}
    </PhoneShell>
  );
}
