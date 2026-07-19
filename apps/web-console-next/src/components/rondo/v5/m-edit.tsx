/*
 * MEdit — the manager's v5 "night-pitch" Edit-player screen (design-
 * reference lines 524-566, spec §2 screen 9): identity + live OVR, a
 * position picker, six attribute score bars, the manager-role toggle and
 * Remove/Save actions. Takes `playerId` (the row tapped from `MSquad`,
 * `nav('edit:' + playerId)`) as an extra prop beyond the base contract.
 *
 * Score bars: the design's 5-segment "replaces sliders" control (`kit5`'s
 * `SegmentBar`) is a discrete 1-5 scale, while a player's attribute is the
 * continuous 1-99 value `vm.setPlayerScore` persists (the same one v4's
 * slider-based `PlayerScoreSheet` edits). This screen buckets the live value
 * into a 1-5 segment fill for display and, on tap, writes back the bucket's
 * representative 1-99 value — same idea as a quantized slider.
 *
 * Position chips: `Player`/`RondoLive` has no position-edit action yet (only
 * attribute scores and manager role are wired) — the chips are presentational
 * pending that VM addition, matching the design's layout without persisting a
 * change.
 *
 * Manager role: per-player org role isn't a first-class `Player` field (only
 * the viewer's own `vm.isManager` is known — see `MSquad`'s tag derivation
 * for the same gap). The toggle's initial read uses that same convention and
 * persists flips via `vm.promoteToManager(playerId, role)`, treating the
 * player id as the membership id (they coincide in the current single-org
 * membership model); it's disabled — with an explanatory toast — for
 * unlinked (no-email/ghost) players, who have no account to promote.
 */
"use client";

import * as React from "react";
import { skillsFor, type Position, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, SegmentBar, Toggle } from "./kit5";

const POS_OPTS: Position[] = ["GK", "DEF", "MID", "FWD"];

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

function clampAttr(v: number): number {
  return Math.max(1, Math.min(99, Math.round(v)));
}

/** 1-99 → 1-5 segment fill (see module doc comment). */
function bucketOf(v: number): number {
  return Math.max(1, Math.min(5, Math.ceil((v / 99) * 5)));
}

/** 1-5 segment tap → the 1-99 value it writes back. */
function valueForBucket(b: number): number {
  return clampAttr((b / 5) * 99);
}

/** The role/status sub-label under the player's name — same read as
 *  `MSquad`'s tag derivation, spelled out in full words here. */
function roleLabel(vm: RondoVM, playerId: string, email: string | null | undefined): string {
  const isMe = !!vm.myPlayerId && playerId === vm.myPlayerId;
  if (isMe && vm.isManager) return "MANAGER";
  if (!email) return vm.settings.whatsappBridge ? "WHATSAPP UPDATES" : "NO APP ACCOUNT";
  const isXI = vm.confirmedPlayers.some((c) => c.id === playerId);
  return isXI ? "STARTING XI" : "RESERVE";
}

export function MEdit({
  vm,
  nav,
  toast,
  playerId,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  playerId: string;
}) {
  const player = vm.byId(playerId);
  const claimed = !!player?.email;

  const [pos, setPos] = React.useState<Position>((player?.pos as Position) ?? "MID");
  const [skills, setSkills] = React.useState<Record<string, number>>(player?.skills ?? {});
  const [mgrOn, setMgrOn] = React.useState(!!player && vm.myPlayerId === playerId && vm.isManager);

  React.useEffect(() => {
    if (player) {
      setPos(player.pos as Position);
      setSkills(player.skills);
      setMgrOn(vm.myPlayerId === playerId && vm.isManager);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  if (!player) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: ink(0.5), fontSize: 13 }}>
        Player not found.
      </div>
    );
  }

  const keys = skillsFor(pos);

  async function toggleManager() {
    if (!claimed) {
      toast("Link this player to an account first");
      return;
    }
    const next = !mgrOn;
    setMgrOn(next);
    const res = await vm.promoteToManager(playerId, next ? "admin" : "viewer");
    if (!res.ok) {
      setMgrOn(!next);
      toast(res.message || "Couldn't update the manager role");
    } else {
      toast(next ? "Promoted to manager" : "Manager role removed");
    }
  }

  function removeFromTeam() {
    vm.releasePlayer(playerId);
    toast("Removed from squad");
    nav("squad");
  }

  function save() {
    vm.setPlayerScore(playerId, skills);
    toast("Player updated");
    nav("squad");
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={() => nav("squad")}
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
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>Edit player</span>
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
            <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.5), marginTop: 2 }}>{roleLabel(vm, playerId, player.email)}</div>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1.5, color: C5.green, lineHeight: 1 }}>{player.ovr}</div>
            <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: ink(0.45), marginTop: 2 }}>OVR · LIVE</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>POSITION</div>
        <div style={{ marginTop: 7, display: "flex", gap: 6 }}>
          {POS_OPTS.map((p) => {
            const on = p === pos;
            return (
              <div
                key={p}
                onClick={() => setPos(p)}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 12,
                  background: on ? C5.green : C5.card,
                  border: on ? "none" : `1px solid ${ink(0.12)}`,
                  color: on ? C5.surface : ink(0.55),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {p}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>SCORE · TAP SEGMENTS</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 13 }}>
          {keys.map((k) => {
            const v = skills[k] ?? 1;
            return (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: ink(0.55) }}>{SKILL_LABEL[k] ?? k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C5.ink }}>{v}</span>
                </div>
                <SegmentBar value={bucketOf(v)} onChange={(b) => setSkills((s) => ({ ...s, [k]: valueForBucket(b) }))} />
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, borderRadius: 14, border: `1px solid ${ink(0.1)}`, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C5.ink }}>Manager role</div>
            <div style={{ fontSize: 10.5, color: ink(0.5), marginTop: 1 }}>Managers can schedule, draft &amp; edit scores</div>
          </div>
          <Toggle on={mgrOn} onClick={toggleManager} />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <div
            onClick={removeFromTeam}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              border: "1px solid rgba(176,81,47,.35)",
              color: C5.rust,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Remove from team
          </div>
          <div
            onClick={save}
            style={{
              flex: 1.4,
              height: 44,
              borderRadius: 14,
              background: C5.green,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Save changes
          </div>
        </div>
      </div>
      <div style={{ height: 14, flex: "none" }} />
    </div>
  );
}
