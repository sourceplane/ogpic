/*
 * ManagerApp — the manager surface (canvas 2b) on the Pitchside v2 kit, driven
 * by the live useRondo view-model (roster, availability, fixtures, join code /
 * requests, and the backend handlers). Home · Schedule · Draft · Manage squad.
 * In demo mode the same VM runs on the canned seed; in the authenticated app it
 * runs on the org's real data.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "./use-rondo";
import { placeRoster, placeDraft } from "./formation";
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
const TIMES = ["17:00", "18:30", "20:00"];
const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type View = "pitch" | "squad" | "schedule" | "draft";

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "R";
}

export function ManagerApp({ vm }: { vm: RondoVM }) {
  const [view, setView] = React.useState<View>("pitch");
  const [day, setDay] = React.useState(0);
  const [time, setTime] = React.useState(1);
  const [turf, setTurf] = React.useState("Riverside Astro");
  const [copied, setCopied] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Auto-balance when the draft opens with no sides yet.
  React.useEffect(() => {
    if (view === "draft" && !vm.balanced && !vm.drafting) vm.doBalance();
  }, [view]);

  // Upcoming 7 days (client-computed to avoid SSR/CSR drift).
  const days = React.useMemo(() => {
    if (!mounted) return [];
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { d, wd: WD[d.getDay()]!, n: d.getDate() };
    });
  }, [mounted]);

  const team = vm.activeTeamName;
  const slots = placeRoster(vm.players, { availOf: vm.availOf });
  const nextMatch = vm.liveMatches?.[0] ?? null;

  function copy() {
    if (!vm.joinCode) return;
    void navigator.clipboard?.writeText(vm.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function doSchedule() {
    const chosen = days[day]?.d ?? new Date();
    const [hh, mm] = (TIMES[time] ?? "18:30").split(":");
    const dt = new Date(chosen);
    dt.setHours(Number(hh), Number(mm), 0, 0);
    const ok = vm.onSchedule?.({ scheduledAt: dt.toISOString(), venue: { name: turf.trim() || "TBC", address: null, booked: false, mapsUrl: null } });
    Promise.resolve(ok).finally(() => setView("draft"));
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
            {(mounted ? days : Array.from({ length: 7 }, () => null)).map((dd, i) => {
              const on = i === day;
              return (
                <div key={i} onClick={() => setDay(i)} className="rk-press" style={{ flex: 1, height: 56, borderRadius: 14, background: on ? C.ink : C.card, border: on ? "none" : `1px solid ${ink(0.1)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, color: on ? "rgba(242,244,241,.6)" : ink(0.45) }}>{dd?.wd ?? "—"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: on ? C.onDark : ink(0.55) }}>{dd?.n ?? "·"}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            {TIMES.map((tt, i) => (
              <span key={tt} onClick={() => setTime(i)} className="rk-press">
                <Chip variant={i === time ? "green" : "outline"} style={{ padding: "8px 14px", fontSize: 10.5 }}>{tt}</Chip>
              </span>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <MonoLabel>WHERE</MonoLabel>
            <FieldRow icon={<Icon name="search" size={15} color={ink(0.45)} />} right={<span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, color: ink(0.4) }}>TURF NAME</span>} style={{ marginTop: 10 }}>
              <input value={turf} onChange={(e) => setTurf(e.target.value)} placeholder="Turf name" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.ink }} />
            </FieldRow>
            <MapCard height={190} style={{ marginTop: 10 }} action={
              <div style={{ position: "absolute", right: 10, bottom: 10, height: 34, padding: "0 14px", borderRadius: 12, background: C.card, boxShadow: "0 4px 12px rgba(16,21,17,.15)", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="send" size={13} color={C.green} stroke={2.2} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Move pin</span>
              </div>
            } />
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11.5, color: ink(0.55) }}>Pin the location in Google Maps</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Open in Google Maps ↗</span>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <Button variant="green" onClick={doSchedule}>Schedule &amp; notify squad</Button>
            <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9, color: ink(0.45) }}>PLAYERS GET THE PIN &amp; SET AVAILABILITY IN ONE TAP</div>
          </div>
        </ScreenBody>
      </PhoneShell>
    );
  }

  /* ── DRAFT ── */
  if (view === "draft") {
    const { home, away } = placeDraft(vm.home, vm.away);
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C.ink }}>Draft</span>
          <Chip variant="outline" style={{ padding: "6px 12px", fontSize: 10.5, borderRadius: 16 }}>{vm.home.length} v {vm.away.length}</Chip>
        </div>
        <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.green }}>HOME</span>
          <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: C.ink, letterSpacing: -2 }}>{vm.homeAvg}<span style={{ color: ink(0.3) }}>:</span>{vm.awayAvg}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust }}>AWAY</span>
        </div>
        <div style={{ alignSelf: "center", marginTop: 6 }}>
          <Chip variant="greenSoft" style={{ borderRadius: 14 }}>{vm.balanceGap <= 2 ? "BALANCED" : "CLOSE"} · GAP {vm.balanceGap}</Chip>
        </div>
        <PitchCanvas variant="split" style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
          {home.map((p) => <PlayerToken key={p.id} initials={p.initials} name={p.label} filled team="home" size={44} left={p.left} top={p.top} captain={p.captain} />)}
          {away.map((p) => <PlayerToken key={p.id} initials={p.initials} name={p.label} filled team="away" size={44} left={p.left} top={p.top} captain={p.captain} />)}
        </PitchCanvas>
        <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>{vm.drafting ? "BALANCING…" : "AUTO-BALANCED BY RATING"}</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 24px 24px" }}>
          <div onClick={() => vm.doBalance()} className="rk-press" style={{ width: 52, height: 52, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, flex: "none" }} aria-label="Regenerate"><Icon name="refresh" size={18} /></div>
          <Button variant="ink" height={52} radius={16} onClick={() => setView("pitch")}>Start match</Button>
        </div>
      </PhoneShell>
    );
  }

  /* ── MANAGE SQUAD ── */
  if (view === "squad") {
    const pending = (vm.joinRequests ?? []).filter((r) => !vm.invitesResolved[r.id]);
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C.ink }}>Squad</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: ink(0.5) }}>{vm.players.length} MEMBERS</span>
        </div>
        <ScreenBody style={{ padding: "0 24px 20px" }}>
          {vm.joinCode && (
            <div style={{ margin: "16px 0 0", borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: ink(0.45) }}>INVITE CODE</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: 2, color: C.green, marginTop: 3 }}>{vm.joinCode}</div>
              </div>
              <div onClick={copy} className="rk-press" style={{ height: 40, padding: "0 16px", borderRadius: 12, background: C.green, color: C.onDark, display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700 }}><Icon name="share" size={13} /> {copied ? "Copied" : "Share"}</div>
            </div>
          )}

          {pending.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <MonoLabel>PENDING · {pending.length}</MonoLabel>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {pending.map((p) => (
                  <div key={p.id} style={{ borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar initials={initialsOf(p.name)} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 1 }}>{p.via}</div>
                    </div>
                    <div onClick={() => vm.declineJoin(p.id)} className="rk-press" style={{ width: 34, height: 34, borderRadius: 11, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.rust }}><Icon name="x" size={14} /></div>
                    <div onClick={() => vm.approveJoin(p.id)} className="rk-press" style={{ width: 34, height: 34, borderRadius: 11, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: C.onDark }}><Icon name="check" size={14} stroke={3} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <MonoLabel>MEMBERS &amp; ROLES</MonoLabel>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {vm.players.map((m) => (
                <div key={m.id} style={{ borderRadius: 14, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar initials={m.initials} size={34} ring={m.isCaptain ? C.green : undefined} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{m.name}</span>
                  {m.isCaptain && <Chip variant="greenSoft" style={{ fontSize: 8.5, padding: "4px 9px", borderRadius: 10 }}>CAPTAIN</Chip>}
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: m.posColor }}>{m.pos}</span>
                  <div onClick={() => vm.releasePlayer(m.id)} className="rk-press" aria-label="Remove"><Icon name="trash" size={14} color={ink(0.35)} /></div>
                </div>
              ))}
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
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>{team}</span>
          <Icon name="chevronDown" size={14} color={ink(0.5)} stroke={2.4} />
        </div>
        <Avatar initials={initialsOf(team)} size={36} ring={C.gold} bg={C.card} />
      </div>
      <div style={{ padding: "10px 24px 0", display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Chip variant="gold">MANAGER</Chip>
        <Chip>{vm.players.length} PLAYERS</Chip>
        <Chip variant="green">{vm.availableCount} IN</Chip>
      </div>
      <PitchCanvas style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
        {slots.map((p) => (
          <PlayerToken key={p.id} initials={p.initials} name={p.label} team={p.team} dimmed={p.dimmed} captain={p.captain} size={p.size} left={p.left} top={p.top} />
        ))}
      </PitchCanvas>
      <div style={{ margin: "12px 24px 0" }}>
        <FieldRow icon={<Icon name="pin" size={14} color={C.green} />} height={46} style={{ borderRadius: 14 }} right={<span style={{ fontFamily: MONO, fontSize: 9.5, color: C.green, fontWeight: 700 }}>{vm.availableCount} IN · {vm.maybeCount} MAYBE</span>}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600 }}>{nextMatch ? `${nextMatch.dateLabel} · ${nextMatch.venue ?? "TBC"}` : "NO MATCH SCHEDULED"}</span>
        </FieldRow>
      </div>
      {nav}
    </PhoneShell>
  );
}
