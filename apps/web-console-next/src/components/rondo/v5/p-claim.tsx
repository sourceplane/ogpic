/*
 * PClaim — the player's v5 "night-pitch" Claim-profile screen (design-
 * reference lines 1121-1147, spec §2 player screen 2): shown to any
 * signed-in player who hasn't claimed a roster player yet (`vm.canClaim`),
 * including members who joined the squad by code.
 *
 * Self-selection (not email-matching): the manager adds roster players by
 * name + position (rarely an email), so there's nothing to auto-match a
 * joining member against. Approving the join already established trust, so the
 * player simply picks which unclaimed roster row is them — `vm.players` carries
 * every active player (roster.read is granted to viewers) with a `claimed`
 * flag, and the unclaimed ones become a pickable list. Tapping a row calls
 * `vm.claimPlayer(id)` (→ `handleClaimPlayer`); on success the shell re-renders
 * once `myPlayerId` lands (`vm.canClaim` flips false).
 *
 * The secondary "None of these — create my profile" action falls back to
 * `vm.claimMine()` (the server mints a fresh roster player and claims it) for a
 * member who isn't on the roster at all. When there are no unclaimed rows to
 * pick, that mint path is the single primary button.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "@saas/rondo-core";
import { C5, ink, MONO } from "./kit5";
import { POSITION_LABEL } from "./p-home";

export function PClaim({
  vm,
  nav: _nav,
  toast,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
}) {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [minting, setMinting] = React.useState(false);
  const working = !!busyId || minting;

  const unclaimed = vm.players.filter((p) => !p.claimed);
  const hasCandidates = unclaimed.length > 0;
  const single = unclaimed.length === 1;

  async function claimOne(playerId: string) {
    if (working) return;
    setBusyId(playerId);
    const ok = await vm.claimPlayer(playerId);
    setBusyId(null);
    toast(ok ? "Profile claimed" : "Couldn't claim that profile — try again");
  }

  async function mintMine() {
    if (working) return;
    setMinting(true);
    const result = await vm.claimMine();
    setMinting(false);
    if (result.ok) {
      toast("You're all set up");
    } else {
      toast(result.message ?? "Couldn't set up your profile — try again");
    }
  }

  const title = !hasCandidates ? "Set up your player profile" : single ? "We found you on a roster" : "Which one is you?";
  const subtitle = !hasCandidates
    ? "You'll appear on the pitch and can vote, RSVP and rate teammates."
    : single
      ? `${vm.activeTeamName} already added you to the roster. Claim the profile and its history becomes yours.`
      : "Pick the roster profile that's you — its stats, votes and history become yours.";

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: C5.surface }}>
      <div style={{ padding: "22px 26px 0", flex: "none" }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: ink(0.45) }}>ONE LAST THING</div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.7, color: C5.ink, marginTop: 8 }}>{title}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: ink(0.55), lineHeight: 1.5 }}>{subtitle}</div>
      </div>

      {hasCandidates && (
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 8px", display: "flex", flexDirection: "column", gap: 9 }}>
          {unclaimed.map((p) => {
            const rowBusy = busyId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => claimOne(p.id)}
                style={{
                  borderRadius: 18,
                  border: `2px dashed ${rowBusy ? C5.green : "rgba(30,138,94,.4)"}`,
                  background: C5.card,
                  padding: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  cursor: working ? "default" : "pointer",
                  opacity: working && !rowBusy ? 0.5 : 1,
                }}
              >
                <div style={{ width: 46, height: 46, borderRadius: "50%", border: `2px dashed ${ink(0.35)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C5.ink, flex: "none" }}>
                  {p.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink }}>{p.shortName}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 2 }}>
                    {vm.activeTeamName.toUpperCase()} · {POSITION_LABEL[p.pos]}
                  </div>
                </div>
                <div style={{ textAlign: "center", flex: "none" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C5.green, lineHeight: 1 }}>{p.ovr}</div>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 1, color: ink(0.45) }}>OVR</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasCandidates && <div style={{ flex: 1 }} />}

      <div style={{ padding: "0 24px 26px", display: "flex", flexDirection: "column", gap: 9, flex: "none" }}>
        {hasCandidates ? (
          <div
            onClick={mintMine}
            style={{
              height: 48,
              borderRadius: 16,
              background: C5.card,
              border: `1px solid ${ink(0.14)}`,
              color: ink(0.6),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              cursor: working ? "default" : "pointer",
              opacity: minting ? 0.7 : 1,
            }}
          >
            {minting ? "Setting you up…" : "None of these — create my profile"}
          </div>
        ) : (
          <div
            onClick={mintMine}
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
              cursor: working ? "default" : "pointer",
              opacity: minting ? 0.7 : 1,
            }}
          >
            {minting ? "Setting you up…" : "Set me up"}
          </div>
        )}
      </div>
    </div>
  );
}
