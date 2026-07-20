/*
 * PPlayerView — the player's v5 "night-pitch" read-only player detail (spec
 * §2, docs/design/rondo-rating-window-spec.md requirement 5): modeled on
 * `MEdit` minus every edit control — identity + live OVR, the six position-
 * specific attribute segments rendered read-only (no `onChange`, so
 * `SegmentBar` renders non-interactive), labelled "FROM TEAMMATE VOTES"
 * since that's how the score is derived (Rating Window v2 settles votes into
 * scores). No position picker, manager-role toggle, or remove/save actions —
 * this screen never mutates anything. Takes `playerId` (the row tapped from
 * `PSquad`, `nav('pview:' + playerId)`) as an extra prop beyond the base
 * contract; back navigates to `psquad`.
 *
 * `SKILL_LABEL`/`bucketOf` are duplicated from `MEdit` (not exported there) —
 * same "duplicate rather than cross-import a private helper" convention
 * `PHome` already established for `MHome`'s next-row/result-letter helpers.
 */
"use client";

import * as React from "react";
import { skillsFor, type Position, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, SegmentBar } from "./kit5";

const SKILL_LABEL: Record<string, string> = {
  PAC: "PACE",
  SHO: "SHOOTING",
  PAS: "PASSING",
  DRI: "DRIBBLING",
  DEF: "DEFENDING",
  PHY: "STAMINA",
  DIV: "DIVING",
  HAN: "HANDLING",
  KIC: "KICKING",
  REF: "REFLEXES",
  SPD: "SPEED",
  POS: "POSITIONING",
};

/** 1-99 → 1-5 segment fill (same bucketing `MEdit` uses for display). */
function bucketOf(v: number): number {
  return Math.max(1, Math.min(5, Math.ceil((v / 99) * 5)));
}

export function PPlayerView({
  vm,
  nav,
  playerId,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  playerId: string;
}) {
  const player = vm.byId(playerId);

  if (!player) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ink(0.5), fontSize: 13 }}>
        Player not found.
      </div>
    );
  }

  const keys = skillsFor(player.pos as Position);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={() => nav("psquad")}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: C5.card,
            border: `1px solid ${ink(0.14)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C5.ink,
            cursor: "pointer",
          }}
        >
          <Icon name="back" size={16} color={C5.ink} stroke={2.4} />
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>Player</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: "12px 20px 0", background: C5.card, border: `1px solid ${ink(0.1)}`, borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#E5E3D2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: C5.ink,
              flex: "none",
            }}
          >
            {player.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.5), marginTop: 2 }}>{player.pos}</div>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1.5, color: C5.green, lineHeight: 1 }}>{player.ovr}</div>
            <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: ink(0.45), marginTop: 2 }}>OVR</div>
          </div>
        </div>

        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>SCORE · FROM TEAMMATE VOTES</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 13 }}>
          {keys.map((k) => {
            const v = player.skills[k] ?? 1;
            return (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: ink(0.55) }}>{SKILL_LABEL[k] ?? k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C5.ink }}>{v}</span>
                </div>
                <SegmentBar value={bucketOf(v)} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ height: 14, flex: "none" }} />
    </div>
  );
}
