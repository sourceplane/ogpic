/*
 * PHome — the player's v5 "night-pitch" Home screen (design-reference lines
 * 757-801, spec §2 player screen 4): header (team name ▾ → hub, avatar →
 * profile), the chips row (`YOUR OVR n`, position, `RATE NOW →` rust chip
 * when the rating window is open), the heroGrad "next match" ticket (+
 * `VOTE NEEDED (n)` rust chip when any live poll is still unvoted), the team
 * chat preview row, LAST RESULT row and GAMES/GOALS/MOTM stat tiles (from the
 * VM's per-player stats). Presentational — reads `vm` slices, calls
 * `nav`/`toast`; no local screen-flow state of its own.
 */
"use client";

import * as React from "react";
import { initials, MATCH_PHASE_LABEL, type LiveMatchRow, type MatchPhase, type Position, type RondoVM } from "@saas/rondo-core";
import { C5, ChipTag, dashedDivider, Icon, ink, MONO, MonoLabel, TicketHero } from "./kit5";

/** Position → the chips row / profile identity chip's full-word label
 *  (design line 768's "MIDFIELD" chip) — shared with `PProfile`/`PClaim`. */
export const POSITION_LABEL: Record<Position, string> = {
  GK: "GOALKEEPER",
  DEF: "DEFENSE",
  MID: "MIDFIELD",
  FWD: "FORWARD",
  ALL: "UTILITY",
};

/** Priority order for "what's the next match to feature" — same convention
 *  as `MHome`'s (duplicated locally: that helper isn't exported). */
const NEXT_PHASE_ORDER: MatchPhase[] = ["live", "poll", "finalizing", "draft", "scheduled"];

function pickNextRow(rows: LiveMatchRow[]): LiveMatchRow | null {
  for (const phase of NEXT_PHASE_ORDER) {
    const hit = rows.find((r) => r.phase === phase);
    if (hit) return hit;
  }
  return null;
}

function pickLastResult(rows: LiveMatchRow[]): LiveMatchRow | null {
  return rows.find((r) => r.phase === "played") ?? null;
}

/** `"4 – 3"` → `"W"`/`"D"`/`"L"` (same helper as `MHome`'s). */
function resultLetter(row: LiveMatchRow): "W" | "D" | "L" | null {
  const parts = row.score.split("–").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a > b) return "W";
  if (a < b) return "L";
  return "D";
}

const RESULT_STYLE: Record<"W" | "D" | "L", { bg: string; fg: string }> = {
  W: { bg: "rgba(30,138,94,.14)", fg: C5.green },
  L: { bg: "rgba(176,81,47,.14)", fg: C5.rust },
  D: { bg: ink(0.06), fg: ink(0.55) },
};

export function PHome({ vm, nav }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const rows = vm.liveMatches ?? [];
  const nextRow = pickNextRow(rows);
  const lastResult = pickLastResult(rows);
  const lastResultLetter = lastResult ? resultLetter(lastResult) : null;

  const me = vm.myPlayerId ? vm.byId(vm.myPlayerId) : undefined;
  const myInitials = me?.initials ?? initials(vm.activeTeamName);
  const myOvr = me?.ovr ?? 0;
  const myPosLabel = me ? POSITION_LABEL[me.pos] : null;

  const stats = vm.myPlayerId ? vm.playerStats[vm.myPlayerId] : undefined;
  const games = stats?.apps ?? 0;
  const goalsN = stats?.goals ?? 0;
  const motmN = stats?.motm ?? 0;

  // "Vote needed" — count of live polls the viewer's claimed player hasn't
  // voted in yet (spec: Home's `VOTE NEEDED (n)` chip, Matches dock badge).
  const voteNeededCount = vm.myPlayerId
    ? rows.filter((r) => r.phase === "poll" && !(vm.polls[r.id]?.myPlayerVoted ?? true)).length
    : 0;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flex: "none" }}>
        <div onClick={() => nav("hub")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>{vm.activeTeamName}</span>
          <Icon name="chevronD" size={14} color={ink(0.5)} stroke={2.4} />
        </div>
        <div
          onClick={() => nav("profile")}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: C5.card,
            border: `1px solid ${ink(0.14)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: C5.ink,
            cursor: "pointer",
          }}
        >
          {myInitials}
        </div>
      </div>

      <div style={{ padding: "10px 24px 0", display: "flex", gap: 7, flexWrap: "wrap", flex: "none" }}>
        <ChipTag bg={C5.card} fg={C5.ink} size={9.5} style={{ border: `1px solid ${ink(0.12)}` }}>
          YOUR OVR {myOvr}
        </ChipTag>
        {myPosLabel && (
          <ChipTag bg={C5.card} fg={C5.ink} size={9.5} style={{ border: `1px solid ${ink(0.12)}` }}>
            {myPosLabel}
          </ChipTag>
        )}
        {vm.votingOpen && (
          <span onClick={() => nav("rate")} style={{ cursor: "pointer" }}>
            <ChipTag bg={C5.rust} fg={C5.surface} size={9.5}>
              RATE NOW →
            </ChipTag>
          </span>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 20 }}>
        <TicketHero onClick={() => nav("matches")} style={{ margin: "14px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: "rgba(245,242,233,.5)" }}>NEXT MATCH</span>
            <ChipTag bg="rgba(30,138,94,.4)" fg={C5.surface} size={8.5}>
              {nextRow ? MATCH_PHASE_LABEL[nextRow.phase] : "NEW"}
            </ChipTag>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4, marginTop: 10 }}>
            {nextRow ? nextRow.label : "No match on the books"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(245,242,233,.65)", marginTop: 4 }}>
            {nextRow ? nextRow.subLabel : "You'll see the next fixture here"}
          </div>
          <div style={{ marginTop: 14, ...dashedDivider, paddingTop: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {voteNeededCount > 0 && (
              <ChipTag bg={C5.rust} fg={C5.surface} size={9}>
                VOTE NEEDED ({voteNeededCount})
              </ChipTag>
            )}
            <ChipTag bg="rgba(245,242,233,.12)" fg="rgba(245,242,233,.8)" size={9}>
              ALL MATCHES →
            </ChipTag>
          </div>
        </TicketHero>

        <div
          onClick={() => nav("chat")}
          style={{
            margin: "12px 24px 0",
            borderRadius: 18,
            background: C5.card,
            border: `1px solid ${ink(0.12)}`,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "rgba(30,138,94,.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C5.green,
              flex: "none",
            }}
          >
            <Icon name="chat" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>Team chat</div>
            <div style={{ fontSize: 11, color: ink(0.5), marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {vm.chat.rows.length ? vm.chat.rows[vm.chat.rows.length - 1]!.body : "No messages yet"}
            </div>
          </div>
          <ChipTag bg={C5.green} fg={C5.surface} size={8.5}>
            {vm.chat.rows.length}
          </ChipTag>
        </div>

        <div
          onClick={() => nav("psquad")}
          style={{
            margin: "12px 24px 0",
            borderRadius: 18,
            background: C5.card,
            border: `1px solid ${ink(0.12)}`,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: "rgba(30,138,94,.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C5.green,
              flex: "none",
            }}
          >
            <Icon name="squad" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>View squad</div>
            <div style={{ fontSize: 11, color: ink(0.5), marginTop: 1 }}>Full roster · positions &amp; ratings</div>
          </div>
          <span style={{ fontSize: 13, color: ink(0.35) }}>›</span>
        </div>

        {vm.ratingResults.length > 0 && (() => {
          const biggest = [...vm.ratingResults].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]!;
          const biggestName = vm.byId(biggest.playerId)?.name ?? "Player";
          const arrow = biggest.delta > 0 ? "▲" : biggest.delta < 0 ? "▼" : "·";
          return (
            <div
              onClick={() => nav("rate")}
              style={{
                margin: "12px 24px 0",
                borderRadius: 16,
                background: C5.card,
                border: `1px solid ${ink(0.1)}`,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <MonoLabel size={9} tone={0.45} style={{ letterSpacing: 1.5 }}>
                LAST WINDOW
              </MonoLabel>
              <span style={{ flex: 1, fontSize: 12, color: ink(0.6) }}>
                {vm.ratingResults.length} scores updated · biggest mover {biggestName} {arrow}
                {Math.abs(biggest.delta)}
              </span>
            </div>
          );
        })()}

        {lastResult && (
          <div
            style={{
              margin: "12px 24px 0",
              borderRadius: 16,
              background: C5.card,
              border: `1px solid ${ink(0.1)}`,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 13,
            }}
          >
            <MonoLabel size={9} tone={0.45} style={{ letterSpacing: 1.5 }}>
              LAST RESULT
            </MonoLabel>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C5.ink }}>
              {lastResult.teamA?.name ?? "Home"} vs {lastResult.teamB?.name ?? "Away"}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>{lastResult.score}</span>
            {lastResultLetter && (
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: RESULT_STYLE[lastResultLetter].bg,
                  color: RESULT_STYLE[lastResultLetter].fg,
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                {lastResultLetter}
              </span>
            )}
          </div>
        )}

        <div style={{ margin: "12px 24px 0", display: "flex", gap: 8 }}>
          <div style={{ flex: 1, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "11px 0", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.ink }}>{games}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
              GAMES
            </MonoLabel>
          </div>
          <div style={{ flex: 1, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "11px 0", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.ink }}>{goalsN}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
              GOALS
            </MonoLabel>
          </div>
          <div style={{ flex: 1, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "11px 0", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.gold }}>{motmN}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
              MOTM
            </MonoLabel>
          </div>
        </div>
      </div>
    </div>
  );
}
