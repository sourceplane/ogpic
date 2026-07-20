/*
 * PClaim — the player's v5 "night-pitch" Claim-profile screen (design-
 * reference lines 1121-1147, spec §2 player screen 2): shown to any
 * signed-in player who hasn't claimed a roster player yet (`vm.canClaim`),
 * including members who joined the squad by code and have no roster row of
 * their own at all.
 *
 * "Claim mine" (one tap, server-resolved): the old flow guessed at a
 * "candidate" roster player to claim, which meant a member with no matching
 * roster row got shown an arbitrary, unrelated player's card. Now the single
 * primary button always calls `vm.claimMine()` — the server finds an
 * unclaimed roster player matching the caller's email, or mints a fresh one,
 * and claims it; no client-side guessing. On success the shell re-renders
 * once `myPlayerId` lands (`vm.canClaim` flips false).
 *
 * `RondoVM` has no "which roster player matches my email" lookup of its own
 * (there's no viewer-email field to compare roster emails against from here),
 * so `candidatePlayerId` is only ever set by a host that already knows the
 * match; absent (today, always), the screen renders the generic "set up your
 * profile" copy instead of guessing. "WA votes" (how many live polls this
 * ghost's WhatsApp reply already voted in) is derived from `vm.polls` — spec
 * §8 has no dedicated ghost-vote counter yet, and this is the only VM data
 * that actually reflects "voted by WhatsApp reply".
 */
"use client";

import * as React from "react";
import type { RondoVM } from "@saas/rondo-core";
import { C5, ink, MONO } from "./kit5";
import { POSITION_LABEL } from "./p-home";

export function PClaim({
  vm,
  nav,
  toast,
  candidatePlayerId,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  candidatePlayerId?: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const candidate = candidatePlayerId ? vm.byId(candidatePlayerId) : null;
  const matched = !!candidate;
  const stats = candidate ? vm.playerStats[candidate.id] : undefined;
  const games = stats?.apps ?? 0;
  const goalsN = stats?.goals ?? 0;
  const waVotes = candidate ? Object.values(vm.polls).filter((p) => p.votersPlayerIds.includes(candidate.id)).length : 0;

  async function handleClaim() {
    if (busy) return;
    setBusy(true);
    const result = await vm.claimMine();
    setBusy(false);
    if (result.ok) {
      toast(matched ? "Profile claimed" : "You're all set up");
    } else {
      toast(result.message ?? "Couldn't set up your profile — try again");
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: C5.surface }}>
      <div style={{ padding: "22px 26px 0", flex: "none" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: ink(0.45) }}>ONE LAST THING</div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.7, color: C5.ink, marginTop: 8 }}>
          {matched ? "We found you on a roster" : "Set up your player profile"}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, color: ink(0.55), lineHeight: 1.5 }}>
          {matched
            ? `${vm.activeTeamName} has been tracking you via WhatsApp. Claim the profile and its history becomes yours.`
            : "You'll appear on the pitch and can vote, RSVP and rate teammates."}
        </div>
      </div>

      {candidate && (
        <div style={{ margin: "20px 24px 0", borderRadius: 22, border: "2px dashed rgba(30,138,94,.5)", background: C5.card, padding: 18, flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", border: `2px dashed ${ink(0.35)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C5.ink, flex: "none" }}>
              {candidate.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C5.ink }}>
                {candidate.shortName} <span style={{ fontSize: 11, color: ink(0.45) }}>(roster)</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 2 }}>
                {vm.activeTeamName.toUpperCase()} · {POSITION_LABEL[candidate.pos]}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: C5.green, lineHeight: 1 }}>{candidate.ovr}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: ink(0.45) }}>OVR</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <div style={{ flex: 1, borderRadius: 13, background: C5.surface, padding: "9px 0", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>{games}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: ink(0.45), marginTop: 1 }}>GAMES</div>
            </div>
            <div style={{ flex: 1, borderRadius: 13, background: C5.surface, padding: "9px 0", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>{goalsN}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: ink(0.45), marginTop: 1 }}>GOALS</div>
            </div>
            <div style={{ flex: 1, borderRadius: 13, background: C5.surface, padding: "9px 0", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C5.waText }}>{waVotes}</div>
              <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: ink(0.45), marginTop: 1 }}>WA VOTES</div>
            </div>
          </div>

          <div style={{ marginTop: 12, borderRadius: 12, background: "rgba(37,211,102,.1)", padding: "10px 12px", fontSize: 11, color: C5.waText, lineHeight: 1.45 }}>
            Your availability came in by WhatsApp reply — it all merges into your account when you claim.
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ padding: "0 24px 26px", display: "flex", flexDirection: "column", gap: 9, flex: "none" }}>
        <div
          onClick={handleClaim}
          style={{
            height: 54,
            borderRadius: 17,
            background: C5.green,
            color: C5.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {matched ? "This is me — claim profile" : "Set me up"}
        </div>
        <div
          onClick={() => nav("hub")}
          style={{ height: 48, borderRadius: 16, background: C5.card, border: `1px solid ${ink(0.14)}`, color: ink(0.6), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Not me — join with a code
        </div>
      </div>
    </div>
  );
}
