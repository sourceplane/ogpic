/*
 * MHome — the manager's Home screen, organised around "what needs me now".
 *
 * Order of the page, top to bottom:
 *   1. Header      — weekday/context eyebrow, team name → hub, avatar → profile
 *   2. Next match  — a light "ticket" hero with a live countdown, the confirmed
 *                    avatar stack, and a tap-through to all matches
 *   3. NEEDS YOU   — the action inbox: only the things actually waiting on the
 *                    manager (open polls, drop-outs to resolve, join requests,
 *                    a live voting window), each colour-coded with a one-tap
 *                    action. Hidden entirely when nothing is pending.
 *   4. New match   — the primary create CTA
 *   5. Chat / Squad— glanceable rows with the latest message and roster size
 *   6. Season      — collapsed stats (played/won/form + last result), so the
 *                    top of the page stays about decisions, not history
 *
 * Presentational: reads `vm` slices and calls `nav`/`onInvite`; no flow state
 * beyond the season disclosure.
 */
"use client";

import * as React from "react";
import { initials, MATCH_PHASE_LABEL, type LiveMatchRow, type MatchPhase, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, MonoLabel } from "./kit5";
import { CountUp, Pressable, Stagger } from "./anim5";

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

/** `"4 – 3"` → `"W"`/`"D"`/`"L"`. */
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

/** "IN 6 DAYS" / "IN 4H" / "IN 25M" from an ISO instant; null when past or
 *  unknown. `now` is passed in so the value is only computed after mount (a
 *  relative label rendered on the server would mismatch on hydration). */
function countdownLabel(iso: string | null | undefined, now: number | null): string | null {
  if (!iso || now === null) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const ms = t - now;
  if (ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `IN ${mins}M`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `IN ${hrs}H`;
  const days = Math.round(hrs / 24);
  return `IN ${days} DAY${days === 1 ? "" : "S"}`;
}

/** The header eyebrow: today's weekday, plus "MATCH WEEK" when a fixture is
 *  within the next 7 days. */
function eyebrowLabel(nextIso: string | null | undefined, now: number | null): string {
  if (now === null) return "TODAY";
  const weekday = new Date(now).toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();
  if (!nextIso) return weekday;
  const t = Date.parse(nextIso);
  if (!Number.isFinite(t)) return weekday;
  const days = (t - now) / 86_400_000;
  return days >= 0 && days <= 7 ? `${weekday} · MATCH WEEK` : weekday;
}

/* ── needs-you inbox ─────────────────────────────────────────────────────── */

type Tone = "gold" | "rust" | "blue" | "green";

const TONE: Record<Tone, { border: string; tile: string; fg: string }> = {
  gold: { border: "rgba(201,162,75,.55)", tile: "rgba(201,162,75,.16)", fg: C5.goldText },
  rust: { border: "rgba(176,81,47,.45)", tile: "rgba(176,81,47,.12)", fg: C5.rust },
  blue: { border: "rgba(37,99,235,.35)", tile: "rgba(37,99,235,.1)", fg: "#2563EB" },
  green: { border: "rgba(30,138,94,.45)", tile: "rgba(30,138,94,.12)", fg: C5.green },
};

interface NeedItem {
  key: string;
  tone: Tone;
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  meta: string;
  cta: string;
  onClick: () => void;
}

function NeedRow({ item }: { item: NeedItem }) {
  const tone = TONE[item.tone];
  return (
    <Pressable
      onClick={item.onClick}
      style={{
        borderRadius: 18,
        background: C5.card,
        border: `1.5px solid ${tone.border}`,
        padding: "13px 15px",
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
          background: tone.tile,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tone.fg,
          flex: "none",
        }}
      >
        <Icon name={item.icon} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.meta}
        </div>
      </div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: tone.fg, flex: "none" }}>{item.cta} →</span>
    </Pressable>
  );
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export function MHome({
  vm,
  nav,
  toast: _toast,
  onInvite,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  onInvite: () => void;
}) {
  // Relative labels only after mount (keeps SSR markup deterministic).
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [seasonOpen, setSeasonOpen] = React.useState(false);

  const rows = vm.liveMatches ?? [];
  const nextRow = pickNextRow(rows);
  const lastResult = pickLastResult(rows);
  const lastResultLetter = lastResult ? resultLetter(lastResult) : null;

  const played = rows.filter((r) => r.phase === "played");
  const playedCount = played.length;
  const wonCount = played.filter((r) => resultLetter(r) === "W").length;
  const form = played
    .slice(0, 3)
    .map(resultLetter)
    .filter((l): l is "W" | "D" | "L" => l !== null);
  const formLabel = form.length ? form.join("·") : "—";

  const confirmed = vm.confirmedPlayers;
  const confirmedShown = confirmed.slice(0, 3);
  const confirmedOverflow = confirmed.length - confirmedShown.length;

  const meInitials = (vm.myPlayerId && vm.byId(vm.myPlayerId)?.initials) || initials(vm.activeTeamName);
  const countdown = countdownLabel(nextRow?.scheduledAt, now);

  // ── the action inbox ──
  const needs: NeedItem[] = [];
  for (const [matchId, poll] of Object.entries(vm.polls)) {
    if (poll.closedAt) continue;
    const row = rows.find((r) => r.id === matchId);
    const closes = countdownLabel(poll.deadlineAt, now);
    needs.push({
      key: `poll-${matchId}`,
      tone: "gold",
      icon: "flag",
      title: `Poll open · ${row?.label ?? "Match"}`,
      meta: `${poll.votedCount} OF ${poll.eligible} VOTED${closes ? ` · CLOSES ${closes}` : ""}`,
      cta: "View",
      onClick: () => nav(`mdetail:${matchId}`),
    });
  }
  const dropAlert = vm.openDropoutAlert;
  if (dropAlert) {
    needs.push({
      key: "dropout",
      tone: "rust",
      icon: "x",
      title: `${dropAlert.playerName} can't make it`,
      meta: `${dropAlert.reason.toUpperCase()} · NEEDS A REPLACEMENT`,
      cta: "Fix",
      onClick: () => nav(`mdetail:${dropAlert.matchId}`),
    });
  }
  const joinReqs = vm.joinRequests ?? [];
  if (joinReqs.length > 0) {
    needs.push({
      key: "joins",
      tone: "blue",
      icon: "userPlus",
      title: joinReqs.length === 1 ? `${joinReqs[0]!.name} wants to join` : `${joinReqs.length} want to join`,
      meta: "TAP TO APPROVE OR DECLINE",
      cta: "Review",
      onClick: () => nav("squad"),
    });
  }
  if (vm.votingOpen) {
    needs.push({
      key: "voting",
      tone: "green",
      icon: "star",
      title: "Rating window is open",
      meta: `${vm.ratedCount} OF ${vm.totalRatable} RATED`,
      cta: "Open",
      onClick: () => nav("rate"),
    });
  }

  const lastChat = vm.chat.rows.length ? vm.chat.rows[vm.chat.rows.length - 1]! : null;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "10px 22px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flex: "none" }}>
        <Pressable onClick={() => nav("hub")} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.6, color: ink(0.45) }}>
            {eyebrowLabel(nextRow?.scheduledAt, now)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
            <span style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.8, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {vm.activeTeamName}
            </span>
            <Icon name="chevronD" size={15} color={ink(0.45)} stroke={2.4} />
          </div>
        </Pressable>
        <Pressable
          onClick={() => nav("profile")}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: C5.card,
            border: `2px solid ${C5.gold}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: C5.ink,
            cursor: "pointer",
            flex: "none",
            marginTop: 4,
          }}
        >
          {meInitials}
        </Pressable>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 18 }}>
        {/* next-match hero */}
        <Pressable
          onClick={() => nav(nextRow ? "matches" : "wizard")}
          style={{
            margin: "14px 22px 0",
            borderRadius: 24,
            padding: "18px 20px 20px",
            background: "linear-gradient(150deg,#E4EBDF,#D2E0CD)",
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <div style={{ position: "absolute", right: -46, top: -34, width: 190, height: 190, border: "1.5px solid rgba(14,27,20,.07)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", right: -8, top: 44, width: 130, height: 130, border: "1.5px solid rgba(14,27,20,.06)", borderRadius: "50%" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.6, color: ink(0.5) }}>NEXT MATCH</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: 1,
                padding: "5px 10px",
                borderRadius: 11,
                background: "rgba(30,138,94,.18)",
                color: "#1B5E41",
                flex: "none",
              }}
            >
              {countdown ?? (nextRow ? MATCH_PHASE_LABEL[nextRow.phase] : "NOTHING BOOKED")}
            </span>
          </div>
          <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: -0.9, color: C5.ink, marginTop: 12, lineHeight: 1.1 }}>
            {nextRow ? nextRow.label : "No match on the books"}
          </div>
          <div style={{ fontSize: 13.5, color: ink(0.6), marginTop: 5 }}>
            {nextRow ? nextRow.subLabel : "Tap to set one up"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
            {confirmedShown.length > 0 && (
              <div style={{ display: "flex", flex: "none" }}>
                {confirmedShown.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: AVATAR_BG[i % 2],
                      border: `2px solid ${C5.ink}`,
                      marginLeft: i === 0 ? 0 : -9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8.5,
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
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: AVATAR_BG[confirmedShown.length % 2],
                      border: `2px solid ${C5.ink}`,
                      marginLeft: -9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8.5,
                      fontWeight: 700,
                      color: C5.ink,
                    }}
                  >
                    +{confirmedOverflow}
                  </div>
                )}
              </div>
            )}
            <span style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), letterSpacing: 0.6 }}>
              {confirmed.length > 0 ? `${confirmed.length} CONFIRMED · ` : ""}TAP FOR ALL MATCHES
            </span>
          </div>
        </Pressable>

        {/* needs you */}
        {needs.length > 0 && (
          <>
            <div style={{ margin: "22px 22px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <MonoLabel size={9.5} weight={700} tone={0.5} style={{ letterSpacing: 1.6 }}>
                NEEDS YOU
              </MonoLabel>
              <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C5.rust, letterSpacing: 1 }}>
                {needs.length} OPEN
              </span>
            </div>
            <div style={{ margin: "10px 22px 0", display: "flex", flexDirection: "column", gap: 9 }}>
              <Stagger style={{ flex: "none" }}>
                {needs.map((item) => (
                  <NeedRow key={item.key} item={item} />
                ))}
              </Stagger>
            </div>
          </>
        )}

        {/* primary CTA */}
        <Pressable
          onClick={() => nav("wizard")}
          style={{
            margin: "16px 22px 0",
            borderRadius: 22,
            background: C5.green,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", right: -30, top: -30, width: 110, height: 110, border: "2px solid rgba(245,242,233,.14)", borderRadius: "50%" }} />
          <Icon name="plus" size={24} color={C5.surface} stroke={2.4} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.surface, letterSpacing: -0.3 }}>New match</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: "rgba(245,242,233,.72)", marginTop: 3, letterSpacing: 1 }}>
              QUICK SCHEDULE · OR POLL THE SQUAD
            </div>
          </div>
          <span style={{ fontSize: 18, color: "rgba(245,242,233,.7)", flex: "none" }}>›</span>
        </Pressable>

        {/* chat */}
        <Pressable
          onClick={() => nav("chat")}
          style={{
            margin: "10px 22px 0",
            borderRadius: 20,
            background: C5.card,
            border: `1px solid ${ink(0.1)}`,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 13,
            cursor: "pointer",
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(30,138,94,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: C5.green, flex: "none" }}>
            <Icon name="chat" size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink }}>Team chat</div>
            <div style={{ fontSize: 12, color: ink(0.5), marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {lastChat ? `${lastChat.authorName ?? "Someone"}: ${lastChat.body}` : "No messages yet"}
            </div>
          </div>
          {vm.chat.rows.length > 0 && (
            <span
              style={{
                minWidth: 26,
                height: 26,
                borderRadius: 13,
                background: C5.green,
                color: C5.surface,
                fontSize: 10.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 7px",
                flex: "none",
              }}
            >
              {vm.chat.rows.length}
            </span>
          )}
        </Pressable>

        {/* squad */}
        <Pressable
          onClick={() => nav("squad")}
          style={{
            margin: "10px 22px 0",
            borderRadius: 20,
            background: C5.card,
            border: `1px solid ${ink(0.1)}`,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 13,
            cursor: "pointer",
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(37,99,235,.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", flex: "none" }}>
            <Icon name="squad" size={19} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink }}>Squad</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45), marginTop: 3, letterSpacing: 0.8 }}>
              {vm.players.length} PLAYERS
              {vm.joinCode ? ` · CODE ${vm.joinCode}` : ""}
            </div>
          </div>
          <Pressable
            onClick={(e) => {
              // Nested inside the Squad row — don't also navigate to Squad.
              e.stopPropagation();
              onInvite();
            }}
            style={{
              height: 34,
              padding: "0 14px",
              borderRadius: 12,
              background: "rgba(30,138,94,.1)",
              border: `1px solid rgba(30,138,94,.35)`,
              display: "flex",
              alignItems: "center",
              color: C5.green,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              flex: "none",
            }}
          >
            Invite
          </Pressable>
        </Pressable>

        {/* season (collapsed by default) */}
        <div style={{ margin: "20px 22px 0" }}>
          <Pressable
            onClick={() => setSeasonOpen((s) => !s)}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <MonoLabel size={9.5} weight={700} tone={0.5} style={{ letterSpacing: 1.6 }}>
              SEASON
            </MonoLabel>
            <div style={{ flex: 1, height: 1, background: ink(0.1) }} />
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: ink(0.45), letterSpacing: 1 }}>
              {seasonOpen ? "HIDE" : "SHOW"}
            </span>
          </Pressable>

          {seasonOpen && (
            <div className="rk5-rise">
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <StatTile value={<CountUp value={playedCount} />} label="PLAYED" />
                <StatTile value={<CountUp value={wonCount} />} label="WON" color={C5.green} />
                <StatTile value={formLabel} label="FORM" />
              </div>

              {lastResult && (
                <div style={{ marginTop: 9, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <MonoLabel size={8.5} tone={0.45} style={{ letterSpacing: 1.4 }}>
                    LAST
                  </MonoLabel>
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lastResult.teamA?.name ?? "Home"} vs {lastResult.teamB?.name ?? "Away"}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C5.ink, flex: "none" }}>{lastResult.score}</span>
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

              {vm.ratingResults.length > 0 && (() => {
                const biggest = [...vm.ratingResults].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]!;
                const biggestName = vm.byId(biggest.playerId)?.name ?? "Player";
                const arrow = biggest.delta > 0 ? "▲" : biggest.delta < 0 ? "▼" : "·";
                return (
                  <Pressable
                    onClick={() => nav("rate")}
                    style={{ marginTop: 9, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                  >
                    <MonoLabel size={8.5} tone={0.45} style={{ letterSpacing: 1.4 }}>
                      RATINGS
                    </MonoLabel>
                    <span style={{ flex: 1, fontSize: 12, color: ink(0.6) }}>
                      {vm.ratingResults.length} updated · top mover {biggestName} {arrow}
                      {Math.abs(biggest.delta)}
                    </span>
                  </Pressable>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label, color }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ flex: 1, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "12px 0", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? C5.ink }}>{value}</div>
      <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 3 }}>
        {label}
      </MonoLabel>
    </div>
  );
}
