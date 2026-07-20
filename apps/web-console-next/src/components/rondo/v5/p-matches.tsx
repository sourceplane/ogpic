/*
 * PMatches — the player's v5 "night-pitch" Matches list (design-reference
 * lines 803-825, spec §2 player screen 5): a card per `vm.liveMatches` row
 * (label/subLabel, phase chip) with a viewer-specific action line derived
 * from the match's phase plus `vm.polls[id].myPlayerVoted`,
 * `vm.dropouts[id].mine` and the viewer's own team membership (matched by
 * name against the row's `teamA`/`teamB` line-ups — that's all the live
 * fixture rows carry per player), and the "Only managers can schedule
 * matches" footnote. Presentational — reads `vm`, calls `nav` to a match's
 * detail screen.
 */
"use client";

import * as React from "react";
import type { LiveMatchRow, RondoVM } from "@saas/rondo-core";
import { C5, ink, MONO, PhaseChip } from "./kit5";

interface MatchAction {
  label: string;
  color: string;
}

/** The card's viewer-specific action line (spec §2 player screen 5):
 *  `● VOTE NEEDED` (rust, unvoted live poll) → `YOU ARE OUT` (rust, self
 *  dropped out) → `YOU ARE PLAYING` (green, confirmed on a side) →
 *  `WAITING FOR MANAGER` (neutral, nothing to do yet). */
function deriveAction(vm: RondoVM, row: LiveMatchRow): MatchAction {
  const poll = vm.polls[row.id];
  if (row.phase === "poll" && vm.myPlayerId != null && poll != null && !poll.myPlayerVoted) {
    return { label: "● VOTE NEEDED", color: C5.rust };
  }
  if (vm.dropouts[row.id]?.mine) {
    return { label: "YOU ARE OUT", color: C5.rust };
  }
  const myName = vm.myPlayerId ? (vm.byId(vm.myPlayerId)?.name ?? null) : null;
  const onATeam = myName != null && (!!row.teamA?.players?.includes(myName) || !!row.teamB?.players?.includes(myName));
  if ((row.phase === "scheduled" || row.phase === "live") && onATeam) {
    return { label: "YOU ARE PLAYING", color: C5.green };
  }
  return { label: "WAITING FOR MANAGER", color: ink(0.5) };
}

export function PMatches({ vm, nav }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const rows = vm.liveMatches ?? [];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px 0", flex: "none" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>Matches</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && (
          <div style={{ fontSize: 13, color: ink(0.5), textAlign: "center", marginTop: 40 }}>No matches yet.</div>
        )}
        {rows.map((m) => {
          const action = deriveAction(vm, m);
          return (
            <div
              key={m.id}
              onClick={() => nav(`pdetail:${m.id}`)}
              style={{ borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: "15px 16px", cursor: "pointer", flex: "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: C5.ink, flex: 1 }}>{m.label}</span>
                <PhaseChip phase={m.phase} />
              </div>
              <div style={{ fontSize: 12, color: ink(0.55), marginTop: 4 }}>{m.subLabel}</div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: action.color }}>{action.label}</span>
                <span style={{ fontSize: 13, color: ink(0.35) }}>›</span>
              </div>
            </div>
          );
        })}
        <div style={{ borderRadius: 14, border: `1px dashed ${ink(0.2)}`, padding: "11px 16px", fontSize: 11, color: ink(0.5), textAlign: "center" }}>
          Only managers can schedule matches
        </div>
      </div>
    </div>
  );
}
