/*
 * ChatScreen — the v5 "night-pitch" squad chat, shared by the manager and
 * player shells (design-reference lines 437-492 manager / 965-1019 player;
 * spec §2 screen 7): header (crest, member count, invite shortcut for the
 * manager), a reverse-scroll feed over `vm.chat.rows` (text bubbles, poll/
 * sched system cards, note pills), reaction pills, and the `+`/input/send
 * composer. Presentational — reads `vm.chat`/`vm.polls`/`vm.liveMatches`,
 * calls `nav`/`toast`; the host owns the Plus/Invite sheets (`onPlus`/
 * `onInvite`) and wires `vm.chat.send`/`react`/`loadOlder` through this file.
 *
 * `ChatRowVM` (rondo-core) doesn't carry the author's org role — only
 * `authorName` — so the "manager name renders gold" treatment (spec: "theirs:
 * white/left + mono name, manager name gold") uses the closest available
 * signal: an author not found on the roster reads as the squad's organiser
 * (the common shape where a manager runs things without necessarily turning
 * out to play) and renders gold; a rostered author renders the default tone.
 */
"use client";

import * as React from "react";
import { initials, type ChatRowVM, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO } from "./kit5";
import { Stagger } from "./anim5";

/** The system cards' dark gradient (design lines 459/986) — a 2-stop variant
 *  distinct from `TicketHero`'s 3-stop `heroGrad`, so kept local here rather
 *  than folded into kit5. */
const CARD_GRAD = "linear-gradient(150deg,#0C1912,#1A4530)";

function timeLabel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** See file banner: best-effort "is this author the manager" check for the
 *  gold-name treatment, given `ChatRowVM` carries no author-role flag. */
function isManagerAuthor(vm: RondoVM, authorName: string | null): boolean {
  if (!authorName) return false;
  return !vm.players.some((p) => p.name === authorName);
}

type Role = "manager" | "player";

function detailScreen(role: Role, matchId: string): string {
  return `${role === "manager" ? "mdetail" : "pdetail"}:${matchId}`;
}

/* ── row kinds ────────────────────────────────────────────────────────── */

function TextBubble({ vm, row }: { vm: RondoVM; row: ChatRowVM }) {
  const mine = row.mine;
  const ball = row.reactions["⚽"] ?? [];
  const reacted = ball.length > 0;
  const gold = !mine && isManagerAuthor(vm, row.authorName);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "none" }}>
      <div style={{ display: "flex", gap: 7, justifyContent: mine ? "flex-end" : "flex-start" }}>
        {!mine && (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#E5E3D2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 700,
              color: C5.ink,
              flex: "none",
              alignSelf: "flex-end",
            }}
          >
            {initials(row.authorName ?? "?")}
          </div>
        )}
        <div
          onClick={() => vm.chat.react(row.id, "⚽")}
          style={{
            maxWidth: "76%",
            borderRadius: 14,
            background: mine ? C5.green : C5.card,
            border: `1px solid ${mine ? C5.green : ink(0.1)}`,
            padding: "7px 11px 5px",
            boxShadow: "0 1px 2px rgba(14,27,20,.06)",
            cursor: "pointer",
          }}
        >
          {!mine && (
            <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 700, color: gold ? C5.goldText : ink(0.45) }}>
              {row.authorName ?? "Player"}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: mine ? C5.surface : C5.ink, lineHeight: 1.4 }}>{row.body}</div>
          <div
            style={{
              textAlign: "right",
              fontFamily: MONO,
              fontSize: 7,
              color: mine ? "rgba(245,242,233,.65)" : ink(0.35),
              marginTop: 2,
            }}
          >
            {timeLabel(row.createdAt)} {mine ? "✓✓" : ""}
          </div>
        </div>
      </div>
      {reacted && (
        <div
          style={{
            alignSelf: mine ? "flex-end" : "flex-start",
            margin: "-5px 36px 0",
            background: C5.card,
            border: `1px solid ${ink(0.12)}`,
            borderRadius: 10,
            padding: "2px 8px",
            fontSize: 9.5,
            boxShadow: "0 1px 3px rgba(14,27,20,.15)",
            position: "relative",
            zIndex: 1,
          }}
        >
          ⚽ {ball.length}
        </div>
      )}
    </div>
  );
}

function PollCard({ vm, row, role, nav }: { vm: RondoVM; row: ChatRowVM; role: Role; nav: (screen: string) => void }) {
  const poll = row.matchId ? vm.polls[row.matchId] : undefined;
  const leading = poll?.times.length ? poll.times.reduce((a, b) => (b.votes > a.votes ? b : a)) : null;
  const eligible = Math.max(1, poll?.eligible ?? 1);
  const pct = leading ? Math.min(100, Math.round((leading.votes / eligible) * 100)) : 0;
  const meta = poll ? `${poll.votedCount}/${poll.eligible} VOTED · ${poll.closedAt ? "CLOSED" : "OPEN"}` : "";
  const btnLabel = role === "manager" ? "View →" : poll?.myPlayerVoted ? "Voted ✓" : "Vote now →";
  const go = () => row.matchId && nav(detailScreen(role, row.matchId));

  return (
    <div style={{ alignSelf: "center", width: "92%", borderRadius: 16, background: CARD_GRAD, padding: "11px 14px", color: C5.surface, flex: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: "#E9CB8A" }}>📊 AVAILABILITY POLL</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: "rgba(245,242,233,.5)" }}>{timeLabel(row.createdAt)}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 7 }}>{leading ? `Leading: ${leading.label}` : "Waiting on votes"}</div>
      <div style={{ marginTop: 7, height: 5, borderRadius: 3, background: "rgba(245,242,233,.15)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: C5.green }} />
      </div>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: "rgba(245,242,233,.55)" }}>{meta}</span>
        <span onClick={go} style={{ fontSize: 11, fontWeight: 700, color: C5.greenBright, cursor: "pointer" }}>
          {btnLabel}
        </span>
      </div>
    </div>
  );
}

function SchedCard({ vm, row, role, nav }: { vm: RondoVM; row: ChatRowVM; role: Role; nav: (screen: string) => void }) {
  const matchRow = row.matchId ? (vm.liveMatches ?? []).find((m) => m.id === row.matchId) ?? null : null;
  const go = () => row.matchId && nav(detailScreen(role, row.matchId));
  const ratingA = matchRow?.teamA?.rating;
  const ratingB = matchRow?.teamB?.rating;
  const meta = ratingA != null && ratingB != null ? `${ratingA} v ${ratingB} · BALANCED` : "";

  return (
    <div style={{ alignSelf: "center", width: "92%", borderRadius: 16, background: C5.card, border: `1.5px solid ${C5.green}`, padding: "11px 14px", flex: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1.5, color: C5.green }}>✓ MATCH CONFIRMED</span>
        <span style={{ fontFamily: MONO, fontSize: 8, color: ink(0.4) }}>{timeLabel(row.createdAt)}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink, marginTop: 7 }}>{matchRow?.label ?? row.body}</div>
      <div style={{ fontSize: 11.5, color: ink(0.55), marginTop: 2 }}>
        {matchRow?.subLabel ?? "Venue TBC"}
        {matchRow?.mapsUrl ? (
          <>
            {" · "}
            <a href={matchRow.mapsUrl} target="_blank" rel="noreferrer" style={{ color: C5.green, textDecoration: "none" }}>
              Directions ↗
            </a>
          </>
        ) : null}
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.45) }}>{meta}</span>
        <span onClick={go} style={{ fontSize: 11, fontWeight: 700, color: C5.green, cursor: "pointer" }}>
          View lineup →
        </span>
      </div>
    </div>
  );
}

function NotePill({ row }: { row: ChatRowVM }) {
  return (
    <div
      style={{
        alignSelf: "center",
        fontFamily: MONO,
        fontSize: 8.5,
        color: ink(0.45),
        background: ink(0.05),
        borderRadius: 10,
        padding: "5px 12px",
        flex: "none",
      }}
    >
      {row.body}
    </div>
  );
}

function ChatRow({ vm, row, role, nav }: { vm: RondoVM; row: ChatRowVM; role: Role; nav: (screen: string) => void }) {
  switch (row.kind) {
    case "poll":
      return <PollCard vm={vm} row={row} role={role} nav={nav} />;
    case "sched":
      return <SchedCard vm={vm} row={row} role={role} nav={nav} />;
    case "note":
      return <NotePill row={row} />;
    default:
      return <TextBubble vm={vm} row={row} />;
  }
}

/* ── screen ───────────────────────────────────────────────────────────── */

export function ChatScreen({
  vm,
  nav,
  toast,
  role,
  onInvite,
  onPlus,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  role: Role;
  onInvite?: () => void;
  onPlus?: () => void;
}) {
  const [draft, setDraft] = React.useState("");
  const feed = [...vm.chat.rows].reverse();

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const res: { ok: boolean; message?: string } = await vm.chat.send(body);
    if (!res.ok) toast(res.message ?? "Couldn't send — try again");
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "14px 24px 10px", display: "flex", alignItems: "center", gap: 11, borderBottom: `1px solid ${ink(0.08)}`, flex: "none" }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 13,
            background: C5.green,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: C5.surface,
            flex: "none",
          }}
        >
          {vm.activeTeam.crest}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>{vm.activeTeamName}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C5.green, flex: "none" }} />
            <span style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5) }}>{vm.activeTeam.members} MEMBERS</span>
          </div>
        </div>
        {role === "manager" && onInvite && (
          <div
            onClick={onInvite}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "rgba(30,138,94,.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C5.green,
              cursor: "pointer",
              flex: "none",
            }}
          >
            <Icon name="userPlus" size={16} />
          </div>
        )}
      </div>

      {/* feed */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column-reverse", padding: "10px 14px", gap: 7 }}>
        <Stagger style={{ flex: "none" }}>
          {feed.map((row) => (
            <ChatRow key={row.id} vm={vm} row={row} role={role} nav={nav} />
          ))}
        </Stagger>
        {vm.chat.hasMore && (
          <div
            onClick={() => vm.chat.loadOlder()}
            style={{ alignSelf: "center", fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C5.green, cursor: "pointer", padding: "6px 10px", flex: "none" }}
          >
            Load earlier messages
          </div>
        )}
      </div>

      {/* composer */}
      <div style={{ flex: "none", padding: "10px 16px 14px", display: "flex", gap: 8, borderTop: `1px solid ${ink(0.08)}` }}>
        <div
          onClick={onPlus}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: C5.card,
            border: `1px solid ${ink(0.14)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C5.green,
            cursor: "pointer",
            flex: "none",
          }}
        >
          <Icon name="plus" size={17} stroke={2.2} />
        </div>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Message the squad…"
          style={{
            flex: 1,
            minWidth: 0,
            height: 42,
            borderRadius: 14,
            background: C5.card,
            border: `1px solid ${ink(0.14)}`,
            padding: "0 14px",
            fontFamily: "inherit",
            fontSize: 13,
            color: C5.ink,
            outline: "none",
          }}
        />
        <div
          onClick={send}
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: C5.green,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C5.surface,
            cursor: "pointer",
            flex: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
