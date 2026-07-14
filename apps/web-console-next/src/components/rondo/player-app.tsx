/*
 * PlayerApp — the player surface (canvas 2c) on the Pitchside v2 kit, driven by
 * the live useRondo view-model. Home (roster pitch) + the shared Rate and Games
 * views. No scheduling, no squad admin.
 *
 * Note: personal availability needs a per-viewer player id the backend doesn't
 * surface yet (RX7), so Home shows the squad availability summary rather than a
 * personal in/out toggle. Wired the moment the self-id lands.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "./use-rondo";
import { TeamSwitcher, type TeamNav } from "./team-switcher";
import { RateView, GamesView } from "./views";
import { placeRoster } from "./formation";
import { C, ink, PhoneShell, StatusBar, Avatar, Icon, PitchCanvas, PlayerToken, BottomNavPlayer, type PlayerTab } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

type View = "pitch" | "rate" | "games";

export function PlayerApp({ vm, teamNav }: { vm: RondoVM; teamNav?: TeamNav | undefined }) {
  const [view, setView] = React.useState<View>("pitch");
  const [switcher, setSwitcher] = React.useState(false);

  const unrated = vm.players.filter((p) => !vm.rated.includes(p.id)).length;
  const nav = <BottomNavPlayer active={view as PlayerTab} rateBadge={unrated} onSelect={(t) => setView(t)} />;

  if (view === "rate") return <RateView vm={vm} nav={nav} />;
  if (view === "games") return <GamesView vm={vm} nav={nav} />;

  /* ── HOME (pitch) ── */
  const slots = placeRoster(vm.players, { availOf: vm.availOf });
  return (
    <PhoneShell>
      <StatusBar />
      {teamNav && <TeamSwitcher open={switcher} onClose={() => setSwitcher(false)} nav={teamNav} />}
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={teamNav ? () => setSwitcher(true) : undefined} className={teamNav ? "rk-press" : undefined} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>{vm.activeTeamName}</span>
          <Icon name="chevronDown" size={14} color={ink(0.5)} stroke={2.4} />
        </div>
        <Avatar initials="ME" size={36} bg={C.card} ring={ink(0.14)} />
      </div>
      <div style={{ padding: "10px 24px 0", display: "flex", gap: 7 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 14, background: C.card, border: `1px solid ${ink(0.12)}`, color: C.ink }}>{vm.players.length} PLAYERS</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 14, background: C.green, color: C.onDark }}>{vm.availableCount} IN</span>
      </div>
      <PitchCanvas style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
        {slots.map((p) => (
          <PlayerToken key={p.id} initials={p.initials} name={p.label} team={p.team} dimmed={p.dimmed} captain={p.captain} size={p.size} left={p.left} top={p.top} />
        ))}
      </PitchCanvas>
      <div style={{ margin: "12px 24px 0", borderRadius: 16, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1, color: ink(0.45) }}>NEXT MATCH</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 3 }}>{vm.availableCount} in · {vm.maybeCount} maybe</div>
        </div>
        <div onClick={() => setView("games")} className="rk-press" style={{ height: 38, padding: "0 16px", borderRadius: 19, background: C.green, color: C.onDark, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center" }}>View games</div>
      </div>
      {nav}
    </PhoneShell>
  );
}
