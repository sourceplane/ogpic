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
import { C5, Console, Hairline, Icon, ink, MONO, MonoLabel, SectionHead, Seam } from "./kit5";
import { CountUp, Pressable } from "./anim5";

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
  W: { bg: "rgba(var(--rk-green-rgb),.14)", fg: C5.green },
  L: { bg: "rgba(var(--rk-rust-rgb),.14)", fg: C5.rust },
  D: { bg: ink(0.06), fg: ink(0.55) },
};

export function PHome({ vm, nav }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const [seasonOpen, setSeasonOpen] = React.useState(false);
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


  // The player's own action inbox: polls they still owe a vote on, and a live
  // rating window. Same shape as the manager's, so Home reads the same for
  // both roles — the focus block is whatever is most urgent.
  const needs: { key: string; kind: string; title: string; meta: string; cta: string; tint: string; fg: string; onClick: () => void }[] = [];
  const openPoll = rows.find((r) => r.phase === "poll" && !(vm.polls[r.id]?.myPlayerVoted ?? true));
  if (openPoll) {
    const poll = vm.polls[openPoll.id];
    needs.push({
      key: "vote",
      kind: "YOUR VOTE",
      title: `Vote on ${openPoll.label}`,
      meta: poll?.deadlineAt ? "CLOSES SOON · PICK TIMES & TURFS" : "PICK TIMES & TURFS",
      cta: "Vote",
      tint: "rgba(var(--rk-rust-rgb),.12)",
      fg: C5.rust,
      onClick: () => nav(`pdetail:${openPoll.id}`),
    });
  }
  if (vm.votingOpen) {
    needs.push({
      key: "rate",
      kind: "RATING WINDOW",
      title: "Rate your teammates",
      meta: `${vm.ratedCount} OF ${vm.totalRatable} RATED`,
      cta: "Rate",
      tint: "rgba(var(--rk-green-rgb),.12)",
      fg: C5.green,
      onClick: () => nav("rate"),
    });
  }
  // "YOU'RE IN" on the hero: the viewer's claimed player is in the confirmed
  // line-up for the next match.
  const amIn = !!vm.myPlayerId && vm.confirmedPlayers.some((p) => p.id === vm.myPlayerId);
  const focus = needs[0];
  const lastMsg = vm.chat.rows.length ? vm.chat.rows[vm.chat.rows.length - 1]! : null;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 22px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flex: "none" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.6, color: ink(0.45) }}>YOUR SQUAD</div>
          <Pressable onClick={() => nav("hub")} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", marginTop: 3 }}>
            <span style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.9, color: C5.ink }}>{vm.activeTeamName}</span>
            <Icon name="chevronD" size={13} color={ink(0.45)} stroke={2.4} />
          </Pressable>
        </div>
        <Pressable
          onClick={() => nav("profile")}
          style={{
            width: 37,
            height: 37,
            borderRadius: "50%",
            background: "var(--rk-row-grad)",
            border: `1.5px solid ${ink(0.18)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10.5,
            fontWeight: 700,
            color: C5.ink,
            cursor: "pointer",
            flex: "none",
          }}
        >
          {myInitials}
        </Pressable>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "13px 18px 16px" }}>
        <Console>
          {/* pitch hero */}
          <Pressable
            onClick={() => nav("matches")}
            style={{ position: "relative", padding: 18, background: C5.heroGrad, overflow: "hidden", cursor: "pointer", display: "block" }}
          >
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 34px,transparent 34px 68px)" }} />
            <div style={{ position: "absolute", left: -30, bottom: -70, width: 240, height: 210, background: "radial-gradient(closest-side,rgba(var(--rk-green-rgb),.22),transparent)" }} />
            <div style={{ position: "absolute", right: -54, top: -54, width: 170, height: 170, border: "2px solid rgba(255,255,255,.09)", borderRadius: "50%" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.6, color: "rgba(var(--rk-on-dark-rgb),.55)" }}>NEXT MATCH</span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 8.5,
                    fontWeight: 700,
                    padding: "4px 9px",
                    borderRadius: 9,
                    background: "rgba(var(--rk-green-rgb),.16)",
                    border: "1px solid rgba(var(--rk-green-rgb),.3)",
                    color: C5.greenBright,
                    flex: "none",
                  }}
                >
                  {nextRow ? MATCH_PHASE_LABEL[nextRow.phase] : "NOTHING BOOKED"}
                </span>
              </div>
              <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: -0.8, color: "#F4F6F3", marginTop: 9 }}>
                {nextRow ? nextRow.label : "No match on the books"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(var(--rk-on-dark-rgb),.62)", marginTop: 4 }}>
                {nextRow ? nextRow.subLabel : "You'll see the next fixture here"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                {amIn && (
                  <>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: C5.greenBright, flex: "none" }} />
                    <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(var(--rk-on-dark-rgb),.6)" }}>YOU&rsquo;RE IN</span>
                  </>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, color: C5.greenBright, flex: "none" }}>ALL MATCHES ›</span>
              </div>
            </div>
          </Pressable>

          <Seam />

          {focus ? (
            <>
              <SectionHead label="NEEDS YOU" right={`${needs.length} OPEN`} />
              <Pressable onClick={focus.onClick} style={{ padding: "14px 18px 15px", background: focus.tint, cursor: "pointer", display: "block" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="rk5-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: focus.fg, flex: "none" }} />
                  <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: 1.6, color: focus.fg }}>{focus.kind}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: ink(0.35) }}>DO THIS FIRST</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, color: C5.ink, marginTop: 9 }}>{focus.title}</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 5 }}>{focus.meta}</div>
                <div style={{ marginTop: 11, fontSize: 12.5, fontWeight: 700, color: focus.fg }}>{focus.cta} →</div>
              </Pressable>
              {needs.slice(1).map((n) => (
                <div key={n.key}>
                  <Hairline />
                  <Pressable onClick={n.onClick} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <span style={{ width: 25, height: 25, borderRadius: 8, background: n.tint, color: n.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <Icon name="star" size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: ink(0.9) }}>{n.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.4), marginTop: 2 }}>{n.meta}</div>
                    </div>
                    <span style={{ fontSize: 13, color: ink(0.3), flex: "none" }}>›</span>
                  </Pressable>
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 11, background: "rgba(var(--rk-green-rgb),.06)" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(var(--rk-green-rgb),.16)", color: C5.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flex: "none" }}>
                ✓
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C5.ink }}>All caught up</div>
                <div style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.42), marginTop: 2 }}>NOTHING NEEDS YOU RIGHT NOW</div>
              </div>
            </div>
          )}

          <Seam />

          <SectionHead label="DO" />
          <Pressable onClick={() => nav("chat")} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, background: ink(0.06), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="chat" size={15} color={ink(0.75)} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>Team chat</div>
              <div style={{ fontSize: 11, color: ink(0.5), marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lastMsg ? `${lastMsg.authorName ?? "Someone"}: ${lastMsg.body}` : "No messages yet"}
              </div>
            </div>
            {vm.chat.rows.length > 0 && (
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, padding: "3px 7px", borderRadius: 9, background: "rgba(var(--rk-green-rgb),.16)", color: C5.green, flex: "none" }}>
                {vm.chat.rows.length}
              </span>
            )}
          </Pressable>
          <Hairline />
          {/* the viewer's own card — the canvas's "Your card" row */}
          <Pressable onClick={() => nav("profile")} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(var(--rk-green-rgb),.14)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: "none",
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: C5.green }}>{myOvr}</span>
              <span style={{ fontFamily: MONO, fontSize: 5.5, color: C5.green, marginTop: 1 }}>OVR</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>Your card</div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.45), marginTop: 2 }}>
                {[myPosLabel, `${games} GAMES`, `${goalsN} GOALS`, `${motmN} MOTM`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span style={{ fontSize: 13, color: ink(0.3), flex: "none" }}>›</span>
          </Pressable>
          <Hairline />
          <Pressable onClick={() => nav("psquad")} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <span style={{ width: 30, height: 30, borderRadius: 10, background: ink(0.06), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="squad" size={15} color={ink(0.75)} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>View squad</div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.45), marginTop: 2 }}>FULL ROSTER · POSITIONS &amp; RATINGS</div>
            </div>
            <span style={{ fontSize: 13, color: ink(0.3), flex: "none" }}>›</span>
          </Pressable>

          <Seam />

          <Pressable onClick={() => setSeasonOpen((s) => !s)} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.6, color: ink(0.5) }}>TEAM SEASON</span>
            <span style={{ flex: 1, height: 1, background: "var(--rk-hairline)" }} />
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: ink(0.42) }}>{seasonOpen ? "HIDE" : "SHOW"}</span>
          </Pressable>
          {seasonOpen && (
            <div className="rk5-rise">
              <Hairline />
              <div style={{ padding: "12px 18px 16px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <PStat value={<CountUp value={games} />} label="GAMES" />
                  <PStat value={<CountUp value={goalsN} />} label="GOALS" />
                  <PStat value={<CountUp value={motmN} />} label="MOTM" color={C5.gold} />
                </div>
                {lastResult && (
                  <div style={{ marginTop: 9, borderRadius: 16, background: ink(0.04), padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <MonoLabel size={8.5} tone={0.45} style={{ letterSpacing: 1.4 }}>
                      LAST
                    </MonoLabel>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {lastResult.teamA?.name ?? "Home"} vs {lastResult.teamB?.name ?? "Away"}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C5.ink, flex: "none" }}>{lastResult.score}</span>
                    {lastResultLetter && (
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: RESULT_STYLE[lastResultLetter].bg, color: RESULT_STYLE[lastResultLetter].fg, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        {lastResultLetter}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Console>
      </div>
    </div>
  );
}

function PStat({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, borderRadius: 16, background: ink(0.04), padding: "11px 0", textAlign: "center" }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: color ?? C5.ink }}>{value}</div>
      <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2 }}>
        {label}
      </MonoLabel>
    </div>
  );
}
