/*
 * MRate — the manager's v5 "night-pitch" voting-window screen (design-
 * reference lines 568-584, spec §2 screen 10): a status chip, the voted-
 * count progress bar, and the single Open/Close control (rust when open,
 * since closing settles scores) over the existing v4 rating-round actions
 * (`vm.votingOpen`/`vm.openRound`/`vm.closeRound`) — no new VM surface
 * needed here. `vm.ratedCount`/`vm.totalRatable` are the same "N/M rated"
 * figures the player-side `RateView` already reads.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, ProgressSteps } from "./kit5";

export function MRate({ vm, nav, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const open = vm.votingOpen;
  const percent = vm.totalRatable > 0 ? Math.round((vm.ratedCount / vm.totalRatable) * 100) : 0;

  function toggleVoting() {
    if (open) {
      vm.closeRound();
      toast("Voting window closed — scores settled");
    } else {
      vm.openRound(false);
      toast("Voting window open — squad notified");
    }
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={() => nav("home")}
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
          }}
        >
          <Icon name="back" size={16} color={C5.ink} stroke={2.4} />
        </div>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>Ratings</span>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9.5,
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: 14,
            background: open ? "rgba(30,138,94,.12)" : ink(0.06),
            color: open ? C5.green : ink(0.55),
          }}
        >
          {open ? "OPEN" : "CLOSED"}
        </span>
      </div>

      <div style={{ margin: "14px 24px 0", borderRadius: 20, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 18, flex: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink }}>Voting window</div>
        <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55), lineHeight: 1.45 }}>
          Open it whenever — players rate each other anonymously; votes settle into scores when you close it.
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: ink(0.5) }}>
            {vm.ratedCount} / {vm.totalRatable} VOTED
          </span>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.4) }}>ANONYMOUS</span>
        </div>
        <div style={{ marginTop: 7 }}>
          <ProgressSteps percent={percent} />
        </div>
        <div
          onClick={toggleVoting}
          style={{
            marginTop: 16,
            height: 50,
            borderRadius: 15,
            background: open ? C5.rust : C5.green,
            color: C5.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {open ? "Close voting & settle scores" : "Open voting window"}
        </div>
      </div>

      <div style={{ margin: "14px 24px 0", borderRadius: 16, background: ink(0.04), padding: "12px 14px", fontSize: 11.5, color: ink(0.55), lineHeight: 1.5, flex: "none" }}>
        Opening the window posts a card to the team chat and notifies everyone.
      </div>
    </div>
  );
}
