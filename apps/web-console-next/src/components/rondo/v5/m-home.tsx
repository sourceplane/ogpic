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
import { C5, Console, Hairline, Icon, ink, MONO, MonoLabel, SectionHead, Seam } from "./kit5";
import { CountUp, Pressable } from "./anim5";

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
  W: { bg: "rgba(var(--rk-green-rgb),.14)", fg: C5.green },
  L: { bg: "rgba(var(--rk-rust-rgb),.14)", fg: C5.rust },
  D: { bg: ink(0.06), fg: ink(0.55) },
};

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
  gold: { border: "rgba(var(--rk-gold-rgb),.55)", tile: "rgba(var(--rk-gold-rgb),.16)", fg: C5.goldText },
  rust: { border: "rgba(var(--rk-rust-rgb),.45)", tile: "rgba(var(--rk-rust-rgb),.12)", fg: C5.rust },
  blue: { border: "rgba(var(--rk-blue-rgb),.35)", tile: "rgba(var(--rk-blue-rgb),.1)", fg: C5.blue },
  green: { border: "rgba(var(--rk-green-rgb),.45)", tile: "rgba(var(--rk-green-rgb),.12)", fg: C5.green },
};

interface NeedItem {
  key: string;
  tone: Tone;
  /** Mono marker on the focus block ("POLL OPEN", "DROP-OUT", …). */
  kind: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  meta: string;
  cta: string;
  onClick: () => void;
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
      kind: "POLL OPEN",
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
      kind: "DROP-OUT",
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
      kind: "JOIN REQUEST",
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
      kind: "RATING WINDOW",
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

      {/* ── the console: one card, sections joined by seams ────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "13px 18px 16px" }}>
        <Console>
          {/* pitch hero */}
          <Pressable
            onClick={() => nav(nextRow ? "matches" : "wizard")}
            style={{
              position: "relative",
              padding: 18,
              background: C5.heroGrad,
              overflow: "hidden",
              cursor: "pointer",
              display: "block",
            }}
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
                  {countdown ?? (nextRow ? MATCH_PHASE_LABEL[nextRow.phase] : "NOTHING BOOKED")}
                </span>
              </div>
              <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: -0.8, color: "#F4F6F3", marginTop: 9 }}>
                {nextRow ? nextRow.label : "No match on the books"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(var(--rk-on-dark-rgb),.62)", marginTop: 4 }}>
                {nextRow ? nextRow.subLabel : "Tap to set one up"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14 }}>
                {confirmedShown.length > 0 && (
                  <div style={{ display: "flex", flex: "none" }}>
                    {confirmedShown.map((p, i) => (
                      <div key={p.id} style={{ ...heroPip, marginLeft: i === 0 ? 0 : -6 }}>
                        {p.initials}
                      </div>
                    ))}
                    {confirmedOverflow > 0 && <div style={{ ...heroPip, marginLeft: -6 }}>+{confirmedOverflow}</div>}
                  </div>
                )}
                {confirmed.length > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 7.5, color: "rgba(var(--rk-on-dark-rgb),.5)" }}>{confirmed.length} CONFIRMED</span>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, color: C5.greenBright, flex: "none" }}>ALL MATCHES ›</span>
              </div>
            </div>
          </Pressable>

          <Seam />

          {/* NEEDS YOU — the first item is the focus block, the rest compact rows */}
          {needs.length > 0 ? (
            <>
              <SectionHead label="NEEDS YOU" right={`${needs.length} OPEN`} />
              <FocusBlock item={needs[0]!} />
              {needs.slice(1).map((n) => (
                <div key={n.key}>
                  <Hairline />
                  <CompactNeed item={n} />
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

          {/* DO */}
          <SectionHead label="DO" />
          <ConsoleRow
            onClick={() => nav("wizard")}
            tint="rgba(var(--rk-green-rgb),.14)"
            icon={<Icon name="plus" size={15} color={C5.green} stroke={2.5} />}
            title="New match"
            meta="POLL THE SQUAD · PICK A TURF"
            right={<span style={{ fontSize: 14, color: C5.green }}>›</span>}
          />
          <Hairline />
          <ConsoleRow
            onClick={() => nav("chat")}
            tint={ink(0.06)}
            icon={<Icon name="chat" size={15} color={ink(0.75)} />}
            title="Team chat"
            sub={lastChat ? `${lastChat.authorName ?? "Someone"}: ${lastChat.body}` : "No messages yet"}
            right={
              vm.chat.rows.length > 0 ? (
                <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, padding: "3px 7px", borderRadius: 9, background: "rgba(var(--rk-green-rgb),.16)", color: C5.green, flex: "none" }}>
                  {vm.chat.rows.length}
                </span>
              ) : null
            }
          />
          <Hairline />
          <ConsoleRow
            onClick={() => nav("squad")}
            tint={ink(0.06)}
            icon={<Icon name="squad" size={15} color={ink(0.75)} />}
            title="Squad"
            meta={`${vm.players.length} PLAYERS${vm.joinCode ? ` · CODE ${vm.joinCode}` : ""}`}
            right={
              <Pressable
                onClick={(e) => {
                  e.stopPropagation();
                  onInvite();
                }}
                style={{ height: 28, padding: "0 11px", borderRadius: 9, background: "rgba(var(--rk-green-rgb),.12)", border: "1px solid rgba(var(--rk-green-rgb),.3)", color: C5.green, display: "flex", alignItems: "center", fontSize: 10.5, fontWeight: 700, cursor: "pointer", flex: "none" }}
              >
                Invite
              </Pressable>
            }
          />
          <Hairline />
          {/* Ratings — permanent, so a fresh team can always open a window. */}
          <ConsoleRow
            onClick={() => nav("rate")}
            tint="rgba(var(--rk-gold-rgb),.14)"
            icon={<Icon name="star" size={15} color={C5.goldText} />}
            title="Ratings"
            meta={
              vm.votingOpen
                ? `VOTING LIVE · ${vm.ratedCount}/${vm.totalRatable} VOTED`
                : vm.ratingResults.length > 0
                  ? `WINDOW CLOSED · LAST RUN ${vm.ratingResults.length} UPDATED`
                  : "WINDOW CLOSED · TAP TO OPEN ONE"
            }
            right={
              <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, padding: "3px 7px", borderRadius: 9, background: vm.votingOpen ? "rgba(var(--rk-green-rgb),.16)" : ink(0.06), color: vm.votingOpen ? C5.green : ink(0.55), flex: "none" }}>
                {vm.votingOpen ? "LIVE" : "OPEN"}
              </span>
            }
          />

          <Seam />

          {/* SEASON */}
          <Pressable onClick={() => setSeasonOpen((s) => !s)} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.6, color: ink(0.5) }}>SEASON</span>
            <span style={{ flex: 1, height: 1, background: "var(--rk-hairline)" }} />
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: ink(0.42) }}>{seasonOpen ? "HIDE" : "SHOW"}</span>
          </Pressable>

          {seasonOpen && (
            <div className="rk5-rise">
              <Hairline />
              <div style={{ padding: "12px 18px 16px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <StatTile value={<CountUp value={playedCount} />} label="PLAYED" />
                  <StatTile value={<CountUp value={wonCount} />} label="WON" color={C5.green} />
                  <StatTile value={formLabel} label="FORM" />
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

/** Avatar pip on the hero's confirmed stack. */
const heroPip: React.CSSProperties = {
  width: 23,
  height: 23,
  borderRadius: "50%",
  background: "var(--rk-crest-team)",
  border: "2px solid var(--rk-pitch-2)",
  boxShadow: "0 0 0 1px rgba(var(--rk-green-rgb),.28)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 7,
  fontWeight: 700,
  color: "#DDEBE3",
};

/** The single most important thing waiting on the manager — given its own
 *  tinted block at the top of NEEDS YOU, with a pulsing kind marker. */
function FocusBlock({ item }: { item: NeedItem }) {
  const tone = TONE[item.tone];
  return (
    <Pressable onClick={item.onClick} style={{ padding: "14px 18px 15px", background: tone.tile, cursor: "pointer", display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="rk5-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: tone.fg, flex: "none" }} />
        <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: 1.6, color: tone.fg }}>{item.kind}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: ink(0.35) }}>DO THIS FIRST</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, color: C5.ink, marginTop: 9 }}>{item.title}</div>
      <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 5 }}>{item.meta}</div>
      <div style={{ marginTop: 11, fontSize: 12.5, fontWeight: 700, color: tone.fg }}>{item.cta} →</div>
    </Pressable>
  );
}

/** A secondary needs-you item: compact row under the focus block. */
function CompactNeed({ item }: { item: NeedItem }) {
  const tone = TONE[item.tone];
  return (
    <Pressable onClick={item.onClick} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <span style={{ width: 25, height: 25, borderRadius: 8, background: tone.tile, color: tone.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <Icon name={item.icon} size={13} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: ink(0.9), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
        <div style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.4), marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.meta}</div>
      </div>
      <span style={{ fontSize: 13, color: ink(0.3), flex: "none" }}>›</span>
    </Pressable>
  );
}

/** A DO-section row inside the console. */
function ConsoleRow({
  onClick,
  tint,
  icon,
  title,
  meta,
  sub,
  right,
}: {
  onClick: () => void;
  tint: string;
  icon: React.ReactNode;
  title: string;
  meta?: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <Pressable onClick={onClick} style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <span style={{ width: 30, height: 30, borderRadius: 10, background: tint, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>{title}</div>
        {meta && <div style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.45), marginTop: 2 }}>{meta}</div>}
        {sub && <div style={{ fontSize: 11, color: ink(0.5), marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
      {right}
    </Pressable>
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
