/*
 * ManagerApp — the manager surface (canvas 2b) on the Pitchside v2 kit:
 * Home (pitch-as-canvas), Schedule (day/time + turf name + Maps pin, no
 * booking), Draft (auto-balanced split pitch), and Manage squad (invite code,
 * approvals, roles). Seed-driven so the whole manager loop is demoable and
 * screenshot-verifiable; live data is wired in phase 5.
 */
"use client";

import * as React from "react";
import {
  C,
  ink,
  PhoneShell,
  StatusBar,
  ScreenBody,
  ScreenHeader,
  MonoLabel,
  Chip,
  Button,
  FieldRow,
  Avatar,
  Icon,
  MapCard,
  PitchCanvas,
  PlayerToken,
  BottomNavManager,
  type ManagerTab,
} from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

/* ── seed roster (matches the canvas) ─────────────────────────── */
type Spot = { i: string; n: string; l: string; t: string; team?: "home" | "gold" | "muted"; cap?: boolean; dim?: boolean };
const HOME_XI: Spot[] = [
  { i: "RM", n: "Menon 87", l: "50%", t: "12%" },
  { i: "KB", n: "Brandt 86", l: "15%", t: "34%" },
  { i: "SO", n: "Okafor 83", l: "38%", t: "32%" },
  { i: "TN", n: "Nowak 79", l: "62%", t: "32%" },
  { i: "NK", n: "Klein 77", l: "85%", t: "34%" },
  { i: "YD", n: "Demir 88", l: "15%", t: "58%" },
  { i: "AP", n: "Pirlo 85", team: "gold", l: "38%", t: "56%" },
  { i: "LF", n: "Fernandes 81", team: "muted", dim: true, l: "62%", t: "56%" },
  { i: "AH", n: "Hassan 80", team: "gold", l: "85%", t: "58%" },
  { i: "DC", n: "Costa 84", l: "25%", t: "81%" },
  { i: "MS", n: "Silva 91", cap: true, l: "50%", t: "83%" },
  { i: "JB", n: "Berg 82", l: "75%", t: "81%" },
];

type DraftSpot = { i: string; n: string; l: string; t: string; ring?: boolean; cap?: boolean };
const DRAFT_HOME: DraftSpot[] = [
  { i: "RM", n: "Menon 87", l: "50%", t: "9%" },
  { i: "KB", n: "Brandt 86", l: "27%", t: "20%" },
  { i: "NK", n: "Klein 77", l: "73%", t: "20%" },
  { i: "YD", n: "Demir 88", l: "27%", t: "32%" },
  { i: "AH", n: "Hassan 80", l: "73%", t: "32%" },
  { i: "DC", n: "Costa 84", l: "50%", t: "41%", ring: true },
];
const DRAFT_AWAY: DraftSpot[] = [
  { i: "MS", n: "Silva 91", l: "50%", t: "59%", cap: true, ring: true },
  { i: "AP", n: "Pirlo 85", l: "27%", t: "68%" },
  { i: "LF", n: "Fernandes 81", l: "73%", t: "68%" },
  { i: "TN", n: "Nowak 79", l: "27%", t: "80%" },
  { i: "JB", n: "Berg 82", l: "73%", t: "80%" },
  { i: "SO", n: "Okafor 83", l: "50%", t: "91%" },
];

const DAYS = [
  { d: "MON", n: 13 },
  { d: "TUE", n: 14 },
  { d: "WED", n: 15 },
  { d: "THU", n: 16 },
  { d: "FRI", n: 17 },
  { d: "SAT", n: 18 },
  { d: "SUN", n: 19 },
];
const TIMES = ["17:00", "18:30", "20:00"];

const MEMBERS = [
  { i: "DS", n: "D. Silva", role: "MANAGER" as const, ring: C.gold },
  { i: "MS", n: "Marco Silva", role: "CAPTAIN" as const, pos: "FWD" },
  { i: "YD", n: "Yusuf Demir", pos: "MID" },
  { i: "RM", n: "Ravi Menon", pos: "GK" },
  { i: "KB", n: "Kai Brandt", pos: "DEF" },
];
const PENDING = [
  { i: "CB", n: "Chris Boateng", via: "VIA CODE" },
  { i: "PN", n: "Pavel Novak", via: "VIA LINK" },
];

type View = "pitch" | "squad" | "schedule" | "draft";

export function ManagerApp() {
  const [view, setView] = React.useState<View>("pitch");
  const [day, setDay] = React.useState(5); // SAT 18
  const [time, setTime] = React.useState(1); // 18:30
  const [copied, setCopied] = React.useState(false);

  function copy() {
    void navigator.clipboard?.writeText("RON-4F2").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const nav = (
    <BottomNavManager
      active={(view === "squad" ? "squad" : "pitch") as ManagerTab}
      onKickoff={() => setView("schedule")}
      onSelect={(t) => setView(t === "squad" ? "squad" : "pitch")}
    />
  );

  /* ── SCHEDULE ── */
  if (view === "schedule") {
    return (
      <PhoneShell>
        <StatusBar />
        <ScreenHeader title="Schedule a match" onBack={() => setView("pitch")} />
        <ScreenBody style={{ padding: "18px 24px 24px" }}>
          <MonoLabel>WHEN</MonoLabel>
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            {DAYS.map((dd, i) => {
              const on = i === day;
              return (
                <div
                  key={dd.d}
                  onClick={() => setDay(i)}
                  className="rk-press"
                  style={{ flex: 1, height: 56, borderRadius: 14, background: on ? C.ink : C.card, border: on ? "none" : `1px solid ${ink(0.1)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 8.5, color: on ? "rgba(242,244,241,.6)" : ink(0.45) }}>{dd.d}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: on ? C.onDark : ink(0.55) }}>{dd.n}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            {TIMES.map((tt, i) => (
              <Chip key={tt} variant={i === time ? "green" : "outline"} style={{ padding: "8px 14px", fontSize: 10.5 }}>
                <span onClick={() => setTime(i)}>{tt}</span>
              </Chip>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <MonoLabel>WHERE</MonoLabel>
            <FieldRow
              icon={<Icon name="search" size={15} color={ink(0.45)} />}
              right={<span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, color: ink(0.4) }}>TURF NAME</span>}
              style={{ marginTop: 10 }}
            >
              Riverside Astro
            </FieldRow>
            <MapCard
              height={190}
              style={{ marginTop: 10 }}
              action={
                <div style={{ position: "absolute", right: 10, bottom: 10, height: 34, padding: "0 14px", borderRadius: 12, background: C.card, boxShadow: "0 4px 12px rgba(16,21,17,.15)", display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="send" size={13} color={C.green} stroke={2.2} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Move pin</span>
                </div>
              }
            />
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11.5, color: ink(0.55) }}>Wapping Wall, London E1W 3SS</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Open in Google Maps ↗</span>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <Button variant="green" onClick={() => setView("draft")}>Schedule &amp; notify squad</Button>
            <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9, color: ink(0.45) }}>
              PLAYERS GET THE PIN &amp; SET AVAILABILITY IN ONE TAP
            </div>
          </div>
        </ScreenBody>
      </PhoneShell>
    );
  }

  /* ── DRAFT ── */
  if (view === "draft") {
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C.ink }}>Draft</span>
          <Chip variant="outline" style={{ padding: "6px 12px", fontSize: 10.5, borderRadius: 16 }}>6 v 6 ▾</Chip>
        </div>
        <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.green }}>HOME</span>
          <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: C.ink, letterSpacing: -2 }}>
            84<span style={{ color: ink(0.3) }}>:</span>83
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust }}>AWAY</span>
        </div>
        <div style={{ alignSelf: "center", marginTop: 6 }}>
          <Chip variant="greenSoft" style={{ borderRadius: 14 }}>BALANCED · GAP 1</Chip>
        </div>
        <PitchCanvas variant="split" style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
          {DRAFT_HOME.map((p) => (
            <PlayerToken key={p.i} initials={p.i} name={p.n} filled team="home" size={44} left={p.l} top={p.t} ring={p.ring} />
          ))}
          {DRAFT_AWAY.map((p) => (
            <PlayerToken key={p.i} initials={p.i} name={p.n} filled team="away" size={44} left={p.l} top={p.t} ring={p.ring} captain={p.cap} />
          ))}
        </PitchCanvas>
        <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>DRAG A PLAYER ACROSS THE LINE TO SWAP</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 24px 24px" }}>
          <div className="rk-press" style={{ width: 52, height: 52, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, flex: "none" }} aria-label="Regenerate">
            <Icon name="refresh" size={18} />
          </div>
          <Button variant="ink" height={52} radius={16} onClick={() => setView("pitch")}>Start match</Button>
        </div>
      </PhoneShell>
    );
  }

  /* ── MANAGE SQUAD ── */
  if (view === "squad") {
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C.ink }}>Squad</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: ink(0.5) }}>13 MEMBERS</span>
        </div>
        <ScreenBody style={{ padding: "0 24px 20px" }}>
          <div style={{ margin: "16px 0 0", borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: ink(0.45) }}>INVITE CODE</div>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: 2, color: C.green, marginTop: 3 }}>RON-4F2</div>
            </div>
            <div onClick={copy} className="rk-press" style={{ height: 40, padding: "0 16px", borderRadius: 12, background: C.green, color: C.onDark, display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700 }}>
              <Icon name="share" size={13} /> {copied ? "Copied" : "Share"}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <MonoLabel>PENDING · 2</MonoLabel>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {PENDING.map((p) => (
                <div key={p.i} style={{ borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar initials={p.i} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.n}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 1 }}>{p.via}</div>
                  </div>
                  <div className="rk-press" style={{ width: 34, height: 34, borderRadius: 11, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.rust }}>
                    <Icon name="x" size={14} />
                  </div>
                  <div className="rk-press" style={{ width: 34, height: 34, borderRadius: 11, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: C.onDark }}>
                    <Icon name="check" size={14} stroke={3} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <MonoLabel>MEMBERS &amp; ROLES</MonoLabel>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {MEMBERS.map((m) => (
                <div key={m.i} style={{ borderRadius: 14, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar initials={m.i} size={34} ring={m.ring} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{m.n}</span>
                  {m.role === "MANAGER" && <Chip variant="goldSoft" style={{ fontSize: 8.5, padding: "4px 9px", borderRadius: 10 }}>MANAGER</Chip>}
                  {m.role === "CAPTAIN" && <Chip variant="greenSoft" style={{ fontSize: 8.5, padding: "4px 9px", borderRadius: 10 }}>CAPTAIN</Chip>}
                  {m.pos && <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>{m.pos}</span>}
                  {!m.role && <Icon name="trash" size={14} color={ink(0.35)} />}
                </div>
              ))}
              <div style={{ textAlign: "center", padding: 6, fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>+ 8 MORE</div>
            </div>
          </div>
        </ScreenBody>
        {nav}
      </PhoneShell>
    );
  }

  /* ── HOME (pitch) ── */
  return (
    <PhoneShell>
      <StatusBar />
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Northside FC</span>
          <Icon name="chevronDown" size={14} color={ink(0.5)} stroke={2.4} />
        </div>
        <Avatar initials="DS" size={36} ring={C.gold} bg={C.card} />
      </div>
      <div style={{ padding: "10px 24px 0", display: "flex", gap: 7 }}>
        <Chip variant="gold">MANAGER</Chip>
        <Chip>#4 LOCAL</Chip>
        <Chip>1840 PTS</Chip>
        <Chip variant="green">W·W·W</Chip>
      </div>
      <PitchCanvas style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
        {HOME_XI.map((p) => (
          <PlayerToken key={p.i} initials={p.i} name={p.n} team={p.team ?? "home"} dimmed={p.dim} captain={p.cap} left={p.l} top={p.t} />
        ))}
      </PitchCanvas>
      <div style={{ margin: "12px 24px 0" }}>
        <FieldRow
          icon={<Icon name="pin" size={14} color={C.green} />}
          height={46}
          style={{ borderRadius: 14 }}
          right={<span style={{ fontFamily: MONO, fontSize: 9.5, color: C.green, fontWeight: 700 }}>9 IN · 2 MAYBE</span>}
        >
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600 }}>SAT 18:30 · RIVERSIDE ASTRO</span>
        </FieldRow>
      </div>
      {nav}
    </PhoneShell>
  );
}
