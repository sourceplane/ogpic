/*
 * MDetail — the manager's v5 "night-pitch" Match detail screen (design-
 * reference lines 266-435, spec §2 screen 6 manager side): phase-dependent
 * body driven by the match row's `phase` (from `vm.liveMatches`) plus
 * `vm.polls[matchId]` / `vm.dropouts[matchId]`:
 *   - poll: live banner (deadline + voted/eligible), WhatsApp mirror banner,
 *     TIMES·VOTES + TURFS·VOTES bars, VOTED/WAITING chips, close-poll CTA.
 *   - finalizing: radio pickers (pre-selected to the highest-voted time/turf)
 *     + `Auto-generate balanced teams`.
 *   - draft: kit names + avg A:B + gap chip, interactive night pitch (tap a
 *     token to swap sides), redraft + `Finalize schedule`.
 *   - scheduled/live: confirmed ticket, dropout card (replace/adjust), lineup
 *     pitch (`Edit on pitch →` flips it interactive in place, reusing the
 *     same swap action), `Cancel match`.
 *
 * "No-app"/WhatsApp-only players aren't yet a first-class `Player` flag in
 * `@saas/rondo-core` (only `email` exists) — until that lands, a player
 * without an `email` is treated as a no-app/ghost voter for the WA tag +
 * mirror-banner count, matching spec §8's "ghost/no-app players + WA tags
 * render" intent.
 */
"use client";

import * as React from "react";
import { placeDraft, type MatchPhase, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, MonoLabel, PhaseChip, TicketHero, NightPitch, type PitchToken } from "./kit5";

/* ── small row helpers (poll voters/waiting, finalize radios, vote bars) ── */

function VoterChip({ vm, playerId }: { vm: RondoVM; playerId: string }) {
  const p = vm.byId(playerId);
  const isGhost = !p?.email;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 4px",
        borderRadius: 16,
        background: "rgba(30,138,94,.1)",
        border: "1px solid rgba(30,138,94,.3)",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: C5.green,
          color: C5.surface,
          fontSize: 7.5,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {p?.initials ?? "?"}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: C5.ink }}>{p?.shortName ?? "Player"}</span>
      {isGhost && (
        <span style={{ fontSize: 7, fontWeight: 700, color: C5.waText, background: "rgba(37,211,102,.2)", borderRadius: 6, padding: "1px 5px" }}>
          WA
        </span>
      )}
      <span style={{ fontSize: 9, color: C5.waText, fontWeight: 700 }}>✓</span>
    </div>
  );
}

function WaitingChip({ vm, playerId }: { vm: RondoVM; playerId: string }) {
  const p = vm.byId(playerId);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px 4px 4px",
        borderRadius: 16,
        background: C5.card,
        border: `1px solid ${ink(0.12)}`,
        opacity: 0.75,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#E5E3D2",
          color: C5.ink,
          fontSize: 7.5,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {p?.initials ?? "?"}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: ink(0.6) }}>{p?.shortName ?? "Player"}</span>
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

function FinalizeOption({ label, votes, selected, onPick }: { label: string; votes: number; selected: boolean; onPick: () => void }) {
  return (
    <div
      onClick={onPick}
      style={{
        borderRadius: 14,
        background: C5.card,
        border: `1.5px solid ${selected ? C5.green : ink(0.12)}`,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 18, height: 18, borderRadius: "50%", border: selected ? `5.5px solid ${C5.green}` : `1.5px solid ${ink(0.3)}`, flex: "none" }} />
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C5.ink }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C5.green }}>{votes} ✓</span>
    </div>
  );
}

/** Roster player → pitch token (initials double as the on-pitch label and the
 *  id kit5's `NightPitch` hands back to `onSwap`; positions come from
 *  `placeDraft`, index-aligned with the input list). */
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

export function MDetail({
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
  const firstDropout = dropoutInfo?.open[0];

  const pollTimes = poll?.times ?? [];
  const pollTurfs = poll?.turfs ?? [];
  const pollEligible = Math.max(1, poll?.eligible ?? 1);
  const pollVoters = poll?.votersPlayerIds ?? [];
  const pollWaiting = poll?.waitingPlayerIds ?? [];
  const ghostN = vm.players.filter((p) => !p.email).length;
  const deadLbl = poll ? (poll.deadlineKind === "manual" ? "WHEN YOU CLOSE IT" : `IN ${poll.deadlineKind.toUpperCase()}`) : "";

  const [selTime, setSelTime] = React.useState<string | null>(null);
  const [selTurf, setSelTurf] = React.useState<string | null>(null);
  const [editingLineup, setEditingLineup] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Fresh selection state whenever a different match is opened.
  React.useEffect(() => {
    setSelTime(null);
    setSelTurf(null);
    setEditingLineup(false);
  }, [matchId]);

  // Pre-select the highest-voted time/turf once the poll data is in.
  React.useEffect(() => {
    if (!poll) return;
    if (selTime == null && poll.times.length) {
      const best = poll.times.reduce((a, b) => (b.votes > a.votes ? b : a), poll.times[0]!);
      setSelTime(best.id);
    }
    if (selTurf == null && poll.turfs.length) {
      const best = poll.turfs.reduce((a, b) => (b.votes > a.votes ? b : a), poll.turfs[0]!);
      setSelTurf(best.id);
    }
  }, [poll, selTime, selTurf]);

  const initialsToId = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of [...vm.home, ...vm.away]) map[p.initials] = p.id;
    return map;
  }, [vm.home, vm.away]);

  const draftPlaces = React.useMemo(() => placeDraft(vm.home, vm.away), [vm.home, vm.away]);
  const aTokens = React.useMemo(() => toTokens(vm.home, draftPlaces.home), [vm.home, draftPlaces.home]);
  const bTokens = React.useMemo(() => toTokens(vm.away, draftPlaces.away), [vm.away, draftPlaces.away]);
  const myInitials = vm.myPlayerId ? vm.byId(vm.myPlayerId)?.initials ?? null : null;

  const handleSwap = (tokenId: string) => {
    const realId = initialsToId[tokenId];
    if (realId) vm.toggleSwap(realId);
  };

  async function handleClosePoll() {
    if (busy) return;
    setBusy(true);
    const res = await vm.closePoll(matchId);
    setBusy(false);
    toast(res.ok ? "Poll closed — pick the final slot" : res.message ?? "Couldn't close the poll");
  }

  async function handleGenTeams() {
    if (busy || !selTime || !selTurf) return;
    setBusy(true);
    const res = await vm.finalizeMatch(matchId, selTime, selTurf);
    if (res.ok) {
      vm.doBalance();
      toast("Teams balanced by strength");
    } else {
      toast(res.message ?? "Couldn't finalize the match");
    }
    setBusy(false);
  }

  function handleRedraft() {
    vm.doBalance();
    toast("Redrafted");
  }

  function handleFinalizeSchedule() {
    vm.saveTeams();
    setEditingLineup(false);
    toast("Scheduled — posted to team chat");
  }

  async function handleResolveDropout(playerId: string, replacementId: string, replacementName: string, droppedName: string) {
    if (busy) return;
    setBusy(true);
    const res = await vm.resolveDropout(matchId, playerId, replacementId);
    setBusy(false);
    toast(res.ok ? `${replacementName} is in for ${droppedName}` : res.message ?? "Couldn't resolve the drop-out");
  }

  function handleCancelMatch() {
    // No cancel-match action is wired on the VM yet (spec §4 has no cancel
    // endpoint) — stub, matching the other out-of-scope-for-now affordances.
    toast("Cancel match — coming soon");
  }

  const gapBg = vm.balanceGap <= 1 ? "rgba(30,138,94,.12)" : "rgba(201,162,75,.2)";
  const gapFg = vm.balanceGap <= 1 ? C5.green : C5.goldText;
  const gapLbl = vm.balanceGap <= 1 ? `BALANCED · GAP ${vm.balanceGap}` : `GAP ${vm.balanceGap} — CONSIDER A SWAP`;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={() => nav("matches")}
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
            flex: "none",
          }}
        >
          <Icon name="back" size={16} stroke={2.4} />
        </div>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>{label}</span>
        <PhaseChip phase={phase} />
      </div>

      {phase === "poll" && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px" }}>
          <div
            style={{
              borderRadius: 16,
              background: C5.card,
              border: `1px solid ${ink(0.12)}`,
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>Availability poll is live</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 2 }}>CLOSES {deadLbl} · OR CLOSE MANUALLY</div>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C5.green }}>
              {poll?.votedCount ?? 0}/{poll?.eligible ?? 0}
            </span>
          </div>

          {vm.settings.whatsappBridge && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 9, borderRadius: 13, background: "rgba(37,211,102,.12)", padding: "9px 12px" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: C5.wa, display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", flex: "none" }}>
                <Icon name="whatsapp" size={13} color="#FFFFFF" stroke={2.2} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: C5.waText, lineHeight: 1.4 }}>
                MIRRORED TO WHATSAPP · {ghostN} NO-APP PLAYERS VOTE BY REPLY
              </span>
            </div>
          )}

          <MonoLabel size={9.5} style={{ marginTop: 16 }}>
            TIMES · VOTES
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
            {pollTimes.map((o) => (
              <VoteBar key={o.id} label={o.label} votes={o.votes} pct={Math.min(100, Math.round((o.votes / pollEligible) * 100))} />
            ))}
          </div>

          <MonoLabel size={9.5} style={{ marginTop: 14 }}>
            TURFS · VOTES
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
            {pollTurfs.map((o) => (
              <VoteBar key={o.id} label={o.label} votes={o.votes} pct={Math.min(100, Math.round((o.votes / pollEligible) * 100))} />
            ))}
          </div>

          <MonoLabel size={9.5} style={{ marginTop: 14 }}>
            VOTED · {pollVoters.length}
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pollVoters.map((id) => (
              <VoterChip key={id} vm={vm} playerId={id} />
            ))}
          </div>

          <MonoLabel size={9.5} style={{ marginTop: 12 }}>
            WAITING · {pollWaiting.length}
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pollWaiting.map((id) => (
              <WaitingChip key={id} vm={vm} playerId={id} />
            ))}
          </div>

          <div
            onClick={handleClosePoll}
            style={{
              marginTop: 16,
              height: 52,
              borderRadius: 16,
              background: C5.ink,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Close poll &amp; finalize →
          </div>
        </div>
      )}

      {phase === "finalizing" && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink }}>Pick the final slot</div>
          <div style={{ marginTop: 3, fontSize: 12, color: ink(0.55) }}>Best-voted options are pre-selected.</div>

          <MonoLabel size={9.5} style={{ marginTop: 12 }}>
            TIME
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
            {pollTimes.map((o) => (
              <FinalizeOption key={o.id} label={o.label} votes={o.votes} selected={o.id === selTime} onPick={() => setSelTime(o.id)} />
            ))}
          </div>

          <MonoLabel size={9.5} style={{ marginTop: 12 }}>
            TURF
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
            {pollTurfs.map((o) => (
              <FinalizeOption key={o.id} label={o.label} votes={o.votes} selected={o.id === selTurf} onPick={() => setSelTurf(o.id)} />
            ))}
          </div>

          <div
            onClick={handleGenTeams}
            style={{
              marginTop: 16,
              height: 52,
              borderRadius: 16,
              background: C5.green,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
              opacity: busy || !selTime || !selTurf ? 0.7 : 1,
            }}
          >
            <Icon name="zap" size={16} color={C5.surface} stroke={2.2} />
            Auto-generate balanced teams
          </div>
          <MonoLabel size={8.5} tone={0.45} weight={400} style={{ textAlign: "center", marginTop: 8 }}>
            USES EACH PLAYER&rsquo;S STRENGTH SCORE
          </MonoLabel>
        </div>
      )}

      {phase === "draft" && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 20px" }}>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C5.green }}>HOME</span>
            <span style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, letterSpacing: -2, color: C5.ink }}>
              {vm.homeAvg}
              <span style={{ color: ink(0.3) }}>:</span>
              {vm.awayAvg}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C5.rust }}>AWAY</span>
          </div>
          <div style={{ alignSelf: "center", marginTop: 4, fontFamily: MONO, fontSize: 9, fontWeight: 600, padding: "4px 11px", borderRadius: 12, background: gapBg, color: gapFg }}>
            {gapLbl}
          </div>
          <NightPitch a={aTokens} b={bTokens} interactive onSwap={handleSwap} mePlayerId={myInitials} style={{ flex: 1, minHeight: 0, marginTop: 10 }} />
          <MonoLabel size={8.5} tone={0.45} weight={400} style={{ textAlign: "center", paddingTop: 7 }}>
            TAP A PLAYER TO SWAP THEIR SIDE
          </MonoLabel>
          <div style={{ display: "flex", gap: 10, padding: "9px 0 16px" }}>
            <div
              onClick={handleRedraft}
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: C5.card,
                border: `1px solid ${ink(0.14)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C5.ink,
                cursor: "pointer",
                flex: "none",
              }}
            >
              <Icon name="refresh" size={18} />
            </div>
            <div
              onClick={handleFinalizeSchedule}
              style={{ flex: 1, height: 52, borderRadius: 16, background: C5.ink, color: C5.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              Finalize schedule
            </div>
          </div>
        </div>
      )}

      {(phase === "scheduled" || phase === "live") && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px" }}>
          <TicketHero style={{ padding: "16px 18px" }}>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: "rgba(245,242,233,.5)" }}>CONFIRMED</div>
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

          {firstDropout && (
            <div style={{ marginTop: 12, borderRadius: 18, background: "rgba(176,81,47,.08)", border: "1px solid rgba(176,81,47,.3)", padding: "14px 16px" }}>
              <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: C5.rust }}>DROPOUT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink, marginTop: 6 }}>
                {firstDropout.playerName} dropped out — {firstDropout.reason}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {firstDropout.suggestedReplacement && (
                  <div
                    onClick={() =>
                      handleResolveDropout(
                        firstDropout.playerId,
                        firstDropout.suggestedReplacement!.id,
                        firstDropout.suggestedReplacement!.name,
                        firstDropout.playerName,
                      )
                    }
                    style={{ flex: 1.4, height: 42, borderRadius: 13, background: C5.rust, color: C5.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.7 : 1 }}
                  >
                    Replace with {firstDropout.suggestedReplacement.name} ({firstDropout.suggestedReplacement.ovr})
                  </div>
                )}
                <div
                  onClick={() => setEditingLineup(true)}
                  style={{ flex: 1, height: 42, borderRadius: 13, background: C5.card, border: `1px solid ${ink(0.16)}`, color: C5.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Adjust manually
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <MonoLabel size={9.5}>
              LINEUP · {vm.homeAvg} v {vm.awayAvg}
            </MonoLabel>
            <span onClick={() => setEditingLineup((v) => !v)} style={{ fontSize: 11, fontWeight: 700, color: C5.green, cursor: "pointer" }}>
              Edit on pitch →
            </span>
          </div>

          {editingLineup ? (
            <>
              <NightPitch a={aTokens} b={bTokens} interactive onSwap={handleSwap} mePlayerId={myInitials} style={{ marginTop: 8 }} />
              <MonoLabel size={8.5} tone={0.45} weight={400} style={{ textAlign: "center", paddingTop: 7 }}>
                TAP A PLAYER TO SWAP THEIR SIDE
              </MonoLabel>
              <div style={{ display: "flex", gap: 10, marginTop: 9 }}>
                <div
                  onClick={handleRedraft}
                  style={{ width: 52, height: 52, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C5.ink, cursor: "pointer", flex: "none" }}
                >
                  <Icon name="refresh" size={18} />
                </div>
                <div
                  onClick={handleFinalizeSchedule}
                  style={{ flex: 1, height: 52, borderRadius: 16, background: C5.ink, color: C5.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                >
                  Save lineup
                </div>
              </div>
            </>
          ) : (
            <NightPitch a={aTokens} b={bTokens} mePlayerId={myInitials} style={{ marginTop: 8 }} />
          )}

          {phase === "scheduled" && (
            <div onClick={handleCancelMatch} style={{ marginTop: 12, textAlign: "center", fontSize: 12, fontWeight: 700, color: C5.rust, cursor: "pointer", padding: 6 }}>
              Cancel match
            </div>
          )}
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
