/*
 * MHome — the manager's v5 "night-pitch" Home screen (design-reference lines
 * 90-163, spec §2 screen 3): header (team name → hub, avatar → profile), the
 * heroGrad "next match" ticket (confirmed avatars, poll/all-matches chips),
 * a dropout alert banner, New-match/Voting-window quick actions, the team
 * chat preview row, LAST RESULT row, PLAYED/WON/FORM stat tiles and the
 * dashed invite row. Presentational — reads `vm` slices, calls `nav`/`toast`/
 * `onInvite`; no local screen-flow state of its own.
 */
"use client";

import * as React from "react";
import { initials, MATCH_PHASE_LABEL, type LiveMatchRow, type MatchPhase, type RondoVM } from "@saas/rondo-core";
import { C5, ChipTag, dashedDivider, Icon, ink, MONO, MonoLabel, TicketHero } from "./kit5";

/** Priority order for "what's the next match to feature" — the live one if
 *  any, else wherever the poll pipeline is furthest along, else the soonest
 *  scheduled fixture. Played/cancelled matches never qualify. */
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

/** `"4 – 3"` → `"W"`/`"D"`/`"L"` (the score string's own left-vs-right
 *  comparison, matching the colour the row already carries). */
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

const AVATAR_BG = ["#E5E3D2", "#DCDACA"];

export function MHome({
  vm,
  nav,
  toast,
  onInvite,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  onInvite: () => void;
}) {
  const rows = vm.liveMatches ?? [];
  const nextRow = pickNextRow(rows);
  const lastResult = pickLastResult(rows);

  const played = rows.filter((r) => r.phase === "played");
  const playedCount = played.length;
  const wonCount = played.filter((r) => resultLetter(r) === "W").length;
  const form = played
    .slice(0, 3)
    .map(resultLetter)
    .filter((l): l is "W" | "D" | "L" => l !== null);
  const formLabel = form.length ? form.join("·") : "—";

  const pollsLive = rows.filter((r) => r.phase === "poll").length;

  const confirmed = vm.confirmedPlayers;
  const confirmedShown = confirmed.slice(0, 3);
  const confirmedOverflow = confirmed.length - confirmedShown.length;

  const meInitials = (vm.myPlayerId && vm.byId(vm.myPlayerId)?.initials) || initials(vm.activeTeamName);

  const dropAlert = vm.openDropoutAlert;

  const lastResultLetter = lastResult ? resultLetter(lastResult) : null;

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
            border: `2px solid ${C5.gold}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: C5.ink,
            cursor: "pointer",
          }}
        >
          {meInitials}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 20 }}>
        <TicketHero onClick={() => nav(nextRow ? "matches" : "wizard")} style={{ margin: "14px 24px 0" }}>
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
            {nextRow ? nextRow.subLabel : "Start a new match to poll the squad"}
          </div>
          {confirmedShown.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <div style={{ display: "flex" }}>
                {confirmedShown.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: AVATAR_BG[i % 2],
                      border: `2px solid ${C5.ink}`,
                      marginLeft: i === 0 ? 0 : -7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: C5.ink,
                    }}
                  >
                    {p.initials}
                  </div>
                ))}
                {confirmedOverflow > 0 && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: AVATAR_BG[confirmedShown.length % 2],
                      border: `2px solid ${C5.ink}`,
                      marginLeft: -7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: C5.ink,
                    }}
                  >
                    +{confirmedOverflow}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 8.5, color: "rgba(245,242,233,.6)" }}>{confirmed.length} CONFIRMED</span>
            </div>
          )}
          <div style={{ marginTop: 14, ...dashedDivider, paddingTop: 13, display: "flex", gap: 8 }}>
            <ChipTag bg="rgba(201,162,75,.25)" fg="#E9CB8A" size={9}>
              {pollsLive} POLLS LIVE
            </ChipTag>
            <ChipTag bg="rgba(245,242,233,.12)" fg="rgba(245,242,233,.8)" size={9}>
              ALL MATCHES →
            </ChipTag>
          </div>
        </TicketHero>

        {dropAlert && (
          <div
            onClick={() => nav("matches")}
            style={{
              margin: "10px 24px 0",
              borderRadius: 16,
              background: "rgba(176,81,47,.1)",
              border: "1px solid rgba(176,81,47,.3)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C5.rust, flex: "none" }} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.rust }}>
              {dropAlert.playerName} can&rsquo;t make it &mdash; {dropAlert.reason}
            </span>
            <span style={{ fontSize: 13, color: C5.rust }}>›</span>
          </div>
        )}

        <div style={{ margin: "12px 24px 0", display: "flex", gap: 10 }}>
          <div onClick={() => nav("wizard")} style={{ flex: 1, borderRadius: 18, background: C5.green, padding: "15px 16px", cursor: "pointer" }}>
            <Icon name="plus" size={18} color={C5.surface} stroke={2.2} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C5.surface, marginTop: 9 }}>New match</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: "rgba(245,242,233,.6)", marginTop: 2 }}>POLL THE SQUAD</div>
          </div>
          <div
            onClick={() => nav("rate")}
            style={{ flex: 1, borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: "15px 16px", cursor: "pointer" }}
          >
            <Icon name="star" size={18} color={C5.ink} stroke={2} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink, marginTop: 9 }}>Voting window</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 2 }}>{vm.votingOpen ? "OPEN" : "CLOSED"}</div>
          </div>
        </div>

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
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.ink }}>{playedCount}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
              PLAYED
            </MonoLabel>
          </div>
          <div style={{ flex: 1, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "11px 0", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.green }}>{wonCount}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
              WON
            </MonoLabel>
          </div>
          <div style={{ flex: 1, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "11px 0", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.ink }}>{formLabel}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
              FORM
            </MonoLabel>
          </div>
        </div>

        <div
          onClick={onInvite}
          style={{
            margin: "12px 24px 0",
            borderRadius: 18,
            background: C5.card,
            border: "2px dashed rgba(30,138,94,.45)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              background: "rgba(30,138,94,.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C5.green,
              flex: "none",
            }}
          >
            <Icon name="userPlus" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>Invite players</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 1 }}>TEAM CODE · {vm.joinCode ?? "—"}</div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: C5.green }}>Share →</span>
        </div>
      </div>
    </div>
  );
}
