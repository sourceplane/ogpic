/*
 * PDetail — the player's v5 "night-pitch" Match detail screen (design-
 * reference lines 827-963, spec §2 player screen 6): phase-dependent body
 * driven by the match row's `phase` (from `vm.liveMatches`) plus
 * `vm.polls[matchId]` / `vm.dropouts[matchId]`:
 *   - poll, not voted (or "Edit" tapped): "When can you play?" card, times +
 *     turfs multi-select checkboxes, `Submit availability` → `vm.votePoll`.
 *   - poll, voted: green confirmation + Edit (re-opens the multi-select,
 *     pre-filled), LIVE RESULTS bars, VOTED/WAITING chips.
 *   - finalizing/draft: "Poll closed" empty state (nothing to do until the
 *     manager schedules).
 *   - scheduled/live: confirmed ticket + `TEAM <name>`/`OUT` chip, the
 *     "can't make it anymore?" drop-out card (reason chips → `vm.dropOut`) or
 *     the out-banner + Undo (hidden once a replacement has actually taken the
 *     viewer's spot), and a read-only night pitch with the viewer glowing.
 *
 * "My team membership" for the ticket chip / out-banner's "replaced" check
 * comes from matching the viewer's own name against the row's `teamA`/
 * `teamB.players` name lists — the live fixture rows carry line-ups as names,
 * not ids (`MatchTeamRow`), same limitation `PMatches`' action line works
 * around.
 */
"use client";

import * as React from "react";
import { placeDraft, type MatchPhase, type MatchPollVM, type RondoVM } from "@saas/rondo-core";
import { C5, ChipTag, Icon, ink, MONO, MonoLabel, NightPitch, PhaseChip, TicketHero, type PitchToken } from "./kit5";

const REASONS = ["Injured", "Work", "Travel", "Family"] as const;

function mineIdsOf(poll: MatchPollVM | undefined): string[] {
  if (!poll) return [];
  return [...poll.times, ...poll.turfs].filter((o) => o.mine).map((o) => o.id);
}

function deadlineLabel(poll: MatchPollVM | undefined): string {
  if (!poll) return "";
  return poll.deadlineKind === "manual" ? "MANUALLY" : `IN ${poll.deadlineKind.toUpperCase()}`;
}

function CheckRow({
  label,
  selected,
  onToggle,
  trailing,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  trailing?: string;
}) {
  return (
    <div
      onClick={onToggle}
      style={{ borderRadius: 14, background: C5.card, border: `1.5px solid ${selected ? C5.green : ink(0.12)}`, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 7,
          border: `2px solid ${selected ? C5.green : ink(0.3)}`,
          background: selected ? C5.green : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        {selected && <Icon name="check" size={12} color={C5.surface} stroke={3} />}
      </div>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C5.ink }}>{label}</span>
      {trailing && (
        <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.4) }}>{trailing}</span>
      )}
    </div>
  );
}

function VoteBar({ label, votes, pct }: { label: string; votes: number; pct: number }) {
  return (
    <div style={{ borderRadius: 14, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C5.ink }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C5.green }}>{votes} VOTES</span>
      </div>
      <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: C5.track }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: C5.green }} />
      </div>
    </div>
  );
}

function VoterChip({ vm, playerId }: { vm: RondoVM; playerId: string }) {
  const p = vm.byId(playerId);
  const isGhost = !p?.email;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", borderRadius: 16, background: "rgba(30,138,94,.1)", border: "1px solid rgba(30,138,94,.3)" }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: C5.green, color: C5.surface, fontSize: 7.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {p?.initials ?? "?"}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: C5.ink }}>{p?.shortName ?? "Player"}</span>
      {isGhost && (
        <span style={{ fontSize: 7, fontWeight: 700, color: C5.waText, background: "rgba(37,211,102,.2)", borderRadius: 6, padding: "1px 5px" }}>WA</span>
      )}
      <span style={{ fontSize: 9, color: C5.waText, fontWeight: 700 }}>✓</span>
    </div>
  );
}

function WaitingChip({ vm, playerId }: { vm: RondoVM; playerId: string }) {
  const p = vm.byId(playerId);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.12)}`, opacity: 0.75 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#E5E3D2", color: C5.ink, fontSize: 7.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {p?.initials ?? "?"}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: ink(0.6) }}>{p?.shortName ?? "Player"}</span>
    </div>
  );
}

/** Roster player → pitch token, same convention `MDetail`'s (unexported)
 *  `toTokens` uses. */
function toTokens(
  list: readonly { initials: string; shortName: string; ovr: number }[],
  slots: readonly { left: string; top: string }[],
): PitchToken[] {
  return list.map((p, i) => ({
    id: p.initials,
    nm: p.shortName,
    ovr: p.ovr,
    x: parseFloat(slots[i]?.left ?? "50"),
    y: parseFloat(slots[i]?.top ?? "50"),
  }));
}

export function PDetail({
  vm,
  nav,
  toast,
  matchId,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  matchId: string;
}) {
  const row = vm.liveMatches?.find((m) => m.id === matchId) ?? null;
  const phase: MatchPhase = row?.phase ?? "poll";
  const label = row?.label ?? "Match";

  const poll = vm.polls[matchId];
  const dropoutInfo = vm.dropouts[matchId];
  const isOut = !!dropoutInfo?.mine;

  const [selected, setSelected] = React.useState<string[]>(() => mineIdsOf(poll));
  const [editingVote, setEditingVote] = React.useState(false);
  const [reason, setReason] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setSelected(mineIdsOf(vm.polls[matchId]));
    setEditingVote(false);
    setReason(null);
    setBusy(false);
    // Fresh state whenever a different match is opened — mirrors `matchId`
    // only, deliberately not `poll` (a new object every render).
  }, [matchId]);

  function toggleOption(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function startEdit() {
    setSelected(mineIdsOf(poll));
    setEditingVote(true);
  }

  async function handleSubmitVote() {
    if (busy) return;
    setBusy(true);
    const res = await vm.votePoll(matchId, selected);
    setBusy(false);
    setEditingVote(false);
    toast(res.ok ? "Availability submitted" : (res.message ?? "Couldn't submit your availability"));
  }

  async function handleDropOut() {
    if (busy || !reason) return;
    setBusy(true);
    const res = await vm.dropOut(matchId, reason);
    setBusy(false);
    toast(res.ok ? "You're out — the manager's been notified" : (res.message ?? "Couldn't update your status"));
  }

  async function handleUndo() {
    if (busy) return;
    setBusy(true);
    const res = await vm.undoDropout(matchId);
    setBusy(false);
    toast(res.ok ? "You're back in" : (res.message ?? "Couldn't undo that"));
  }

  const myName = vm.myPlayerId ? (vm.byId(vm.myPlayerId)?.name ?? null) : null;
  const inTeamA = myName != null && !!row?.teamA?.players?.includes(myName);
  const inTeamB = myName != null && !!row?.teamB?.players?.includes(myName);
  const hasLineup = !!row?.teamA && !!row?.teamB;
  const isReplaced = isOut && hasLineup && !inTeamA && !inTeamB;

  const teamChip = isOut
    ? { label: "OUT", bg: "rgba(176,81,47,.4)", fg: C5.surface }
    : inTeamA
      ? { label: (row?.teamA?.name ?? "Team A").toUpperCase(), bg: "rgba(30,138,94,.4)", fg: C5.surface }
      : inTeamB
        ? { label: (row?.teamB?.name ?? "Team B").toUpperCase(), bg: "rgba(176,81,47,.4)", fg: C5.surface }
        : null;

  const draftPlaces = React.useMemo(() => placeDraft(vm.home, vm.away), [vm.home, vm.away]);
  const aTokens = React.useMemo(() => toTokens(vm.home, draftPlaces.home), [vm.home, draftPlaces.home]);
  const bTokens = React.useMemo(() => toTokens(vm.away, draftPlaces.away), [vm.away, draftPlaces.away]);
  const myInitials = vm.myPlayerId ? (vm.byId(vm.myPlayerId)?.initials ?? null) : null;

  const showVoteForm = !poll?.myPlayerVoted || editingVote;
  const pollEligible = Math.max(1, poll?.eligible ?? 1);
  const deadLbl = deadlineLabel(poll);

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={() => nav("matches")}
          style={{ width: 38, height: 38, borderRadius: 12, background: C5.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C5.ink, cursor: "pointer", flex: "none" }}
        >
          <Icon name="back" size={16} stroke={2.4} />
        </div>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>{label}</span>
        <PhaseChip phase={phase} />
      </div>

      {phase === "poll" && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px" }}>
          {showVoteForm ? (
            <div>
              <div style={{ borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: "13px 16px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>When can you play?</div>
                <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 2 }}>PICK ALL THAT WORK · CLOSES {deadLbl}</div>
              </div>

              <MonoLabel size={9.5} style={{ marginTop: 14 }}>TIMES THAT WORK FOR YOU</MonoLabel>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                {(poll?.times ?? []).map((o) => (
                  <CheckRow key={o.id} label={o.label} selected={selected.includes(o.id)} onToggle={() => toggleOption(o.id)} />
                ))}
              </div>

              <MonoLabel size={9.5} style={{ marginTop: 14 }}>TURFS THAT WORK</MonoLabel>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                {(poll?.turfs ?? []).map((o) => (
                  <CheckRow key={o.id} label={o.label} selected={selected.includes(o.id)} onToggle={() => toggleOption(o.id)} trailing="MAP ↗" />
                ))}
              </div>

              <div
                onClick={handleSubmitVote}
                style={{ marginTop: 16, height: 52, borderRadius: 16, background: C5.green, color: C5.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.7 : 1 }}
              >
                Submit availability
              </div>
            </div>
          ) : (
            <div>
              <div style={{ borderRadius: 18, background: "rgba(30,138,94,.1)", border: "1px solid rgba(30,138,94,.3)", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: C5.green, display: "flex", alignItems: "center", justifyContent: "center", color: C5.surface, flex: "none" }}>
                  <Icon name="check" size={16} stroke={3} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>Vote submitted</div>
                  <div style={{ fontSize: 11.5, color: ink(0.55), marginTop: 2 }}>You&rsquo;ll get a push when it&rsquo;s finalized.</div>
                </div>
                <span onClick={startEdit} style={{ fontSize: 11, fontWeight: 700, color: C5.green, cursor: "pointer" }}>
                  Edit
                </span>
              </div>

              <MonoLabel size={9.5} style={{ marginTop: 14 }}>
                LIVE RESULTS · {poll?.votedCount ?? 0}/{poll?.eligible ?? 0} VOTED
              </MonoLabel>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                {(poll?.times ?? []).map((o) => (
                  <VoteBar key={o.id} label={o.label} votes={o.votes} pct={Math.min(100, Math.round((o.votes / pollEligible) * 100))} />
                ))}
              </div>

              <MonoLabel size={9.5} style={{ marginTop: 14 }}>VOTED · {poll?.votersPlayerIds.length ?? 0}</MonoLabel>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(poll?.votersPlayerIds ?? []).map((id) => (
                  <VoterChip key={id} vm={vm} playerId={id} />
                ))}
              </div>

              <MonoLabel size={9.5} style={{ marginTop: 12 }}>WAITING · {poll?.waitingPlayerIds.length ?? 0}</MonoLabel>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(poll?.waitingPlayerIds ?? []).map((id) => (
                  <WaitingChip key={id} vm={vm} playerId={id} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(phase === "finalizing" || phase === "draft") && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: C5.card, border: `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", justifyContent: "center", color: ink(0.4) }}>
            <Icon name="calendar" size={28} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C5.ink, marginTop: 18 }}>Poll closed</div>
          <div style={{ fontSize: 12.5, color: ink(0.55), lineHeight: 1.5, marginTop: 8 }}>
            Your manager is picking the slot and drafting teams &mdash; you&rsquo;ll get a push.
          </div>
        </div>
      )}

      {(phase === "scheduled" || phase === "live") && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px" }}>
          <TicketHero style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: "rgba(245,242,233,.5)" }}>CONFIRMED</span>
              {teamChip && (
                <ChipTag bg={teamChip.bg} fg={teamChip.fg} size={8.5}>
                  {teamChip.label}
                </ChipTag>
              )}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{row?.label ?? "—"}</div>
            <div style={{ fontSize: 12, color: "rgba(245,242,233,.65)", marginTop: 3 }}>
              {row?.subLabel ?? "—"}
              {row?.mapsUrl && (
                <>
                  {" · "}
                  <a href={row.mapsUrl} target="_blank" rel="noreferrer" style={{ color: C5.greenBright, fontWeight: 700, textDecoration: "none" }}>
                    Directions ↗
                  </a>
                </>
              )}
            </div>
          </TicketHero>

          {!isOut && (
            <div style={{ marginTop: 12, borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>Can&rsquo;t make it anymore?</div>
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {REASONS.map((r) => {
                  const on = reason === r;
                  return (
                    <div
                      key={r}
                      onClick={() => setReason(r)}
                      style={{ height: 34, padding: "0 14px", borderRadius: 17, background: on ? C5.rust : C5.card, border: `1px solid ${on ? C5.rust : ink(0.14)}`, color: on ? C5.surface : ink(0.6), display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      {r}
                    </div>
                  );
                })}
              </div>
              <div
                onClick={handleDropOut}
                style={{
                  marginTop: 12,
                  height: 44,
                  borderRadius: 14,
                  border: `1.5px solid ${C5.rust}`,
                  color: reason ? C5.rust : ink(0.35),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: reason ? "pointer" : "default",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {reason ? `Drop out · ${reason}` : "Drop out"}
              </div>
            </div>
          )}

          {isOut && (
            <div style={{ marginTop: 12, borderRadius: 18, background: "rgba(176,81,47,.08)", border: "1px solid rgba(176,81,47,.3)", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C5.rust, display: "flex", alignItems: "center", justifyContent: "center", color: C5.surface, fontSize: 15, fontWeight: 700, flex: "none" }}>
                ✕
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>You&rsquo;re out &mdash; {dropoutInfo?.mine?.reason}</div>
                <div style={{ fontSize: 11.5, color: ink(0.55), marginTop: 2 }}>
                  {isReplaced ? "A replacement has taken your spot." : "You'll get a push if that changes."}
                </div>
              </div>
              {!isReplaced && (
                <span onClick={handleUndo} style={{ fontSize: 11, fontWeight: 700, color: C5.rust, cursor: "pointer" }}>
                  Undo
                </span>
              )}
            </div>
          )}

          <MonoLabel size={9.5} style={{ marginTop: 14 }}>
            LINEUP · {vm.homeAvg} v {vm.awayAvg}
          </MonoLabel>
          <NightPitch a={aTokens} b={bTokens} mePlayerId={myInitials} style={{ marginTop: 8 }} />
        </div>
      )}

      {(phase === "played" || phase === "cancelled") && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <span style={{ fontSize: 13, color: ink(0.5), textAlign: "center" }}>
            {phase === "cancelled" ? "This match was cancelled." : "This match has been played — see it in Games."}
          </span>
        </div>
      )}
    </div>
  );
}
