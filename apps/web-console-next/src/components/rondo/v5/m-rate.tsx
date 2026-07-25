/*
 * MRate — the manager's v5 "night-pitch" voting-window screen (design-
 * reference lines 568-584, spec §2 screen 10; Rating Window v2, docs/design/
 * rondo-rating-window-spec.md): a status chip, a deadline picker (24H/48H/
 * MANUAL, same segmented-control idiom as the wizard's deadline step) shown
 * while CLOSED — Open passes the chosen deadline (`vm.openRound(deadline)`).
 * While OPEN: the live N/M rated progress bar (unchanged) plus the window's
 * own deadline readout, and the Close-&-settle control. Once a round has
 * closed and settled deltas exist (`vm.ratingResults`), a RESULTS list below
 * shows each player's OVR before → after and a delta chip, biggest movers
 * first.
 */
"use client";

import * as React from "react";
import type { PollDeadlineKind, RondoVM } from "@saas/rondo-core";
import { C5, DeltaChip, Icon, ink, MONO, MonoLabel, ProgressSteps } from "./kit5";

const DEADLINES: { kind: PollDeadlineKind; k: string; lbl: string }[] = [
  { kind: "24h", k: "24H", lbl: "AUTO-CLOSE" },
  { kind: "48h", k: "48H", lbl: "AUTO-CLOSE" },
  // The canvas labels the manual option "OPEN" (as in "stays open") — the VM
  // kind is still `manual`.
  { kind: "manual", k: "OPEN", lbl: "YOU CLOSE IT" },
];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** `deadlineAt` (ISO) → "01 AUG · 18:00" for the window's "auto-closes …" readout. */
function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} · ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function MRate({ vm, nav, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const open = vm.votingOpen;
  const percent = vm.totalRatable > 0 ? Math.round((vm.ratedCount / vm.totalRatable) * 100) : 0;
  const [deadline, setDeadline] = React.useState<PollDeadlineKind>("24h");

  const sortedResults = [...vm.ratingResults].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const hasResults = !open && sortedResults.length > 0;

  // The canvas's single status line. Open: how far the round has got and when
  // it ends; closed: what the last settled round did (or that none has run).
  const closesIn = vm.ratingDeadlineKind === "manual"
    ? "CLOSES WHEN YOU SAY"
    : vm.ratingDeadlineAt
      ? `CLOSES ${formatDeadline(vm.ratingDeadlineAt).toUpperCase()}`
      : null;
  const statusLine = open
    ? [`LIVE`, `${vm.ratedCount}/${vm.totalRatable} VOTED`, closesIn].filter(Boolean).join(" · ")
    : sortedResults.length > 0
      ? `WINDOW CLOSED · LAST RUN ${sortedResults.length} UPDATED`
      : "WINDOW CLOSED · NO ROUND YET";

  function toggleVoting() {
    if (open) {
      vm.closeRound();
      toast("Voting window closed — scores settled");
    } else {
      vm.openRound(deadline);
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
            background: open ? "rgba(var(--rk-green-rgb),.12)" : ink(0.06),
            color: open ? C5.green : ink(0.55),
          }}
        >
          {open ? "VOTING LIVE" : "VOTING CLOSED"}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 0 20px" }}>
        <div style={{ margin: "14px 24px 0", borderRadius: 20, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink }}>Voting window</div>
          <div style={{ marginTop: 4, fontSize: 12, color: ink(0.55), lineHeight: 1.45 }}>
            Open it whenever — players rate each other anonymously; votes settle into scores when you close it.
          </div>

          {/* Window length stays on screen while the window is live (the canvas
           *  shows it in both states) but is locked — changing the deadline of
           *  a running window isn't something the VM supports, so the control
           *  reads as the chosen length rather than offering a no-op. */}
          <MonoLabel size={9.5} weight={600} tone={0.5} style={{ marginTop: 16 }}>
            WINDOW LENGTH
          </MonoLabel>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }} aria-disabled={open || undefined}>
            {DEADLINES.map((d) => {
              const on = (open ? vm.ratingDeadlineKind : deadline) === d.kind;
              return (
                <div
                  key={d.kind}
                  onClick={open ? undefined : () => setDeadline(d.kind)}
                  style={{
                    flex: 1,
                    height: 58,
                    borderRadius: 14,
                    background: on ? C5.panel : C5.surface,
                    border: `1.5px solid ${on ? C5.ink : ink(0.11)}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    cursor: open ? "default" : "pointer",
                    opacity: open && !on ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink }}>{d.k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 7.5, color: ink(0.48) }}>{d.lbl}</span>
                </div>
              );
            })}
          </div>

          {/* One status line in both states, as the canvas has it:
           *  "LIVE · 3/12 VOTED · CLOSES IN 24H" / "WINDOW CLOSED · LAST RUN 7/12". */}
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: open ? C5.green : ink(0.55), letterSpacing: 0.6 }}>
              {statusLine}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.4), flex: "none" }}>ANONYMOUS</span>
          </div>
          <div style={{ marginTop: 7 }}>
            <ProgressSteps percent={open ? percent : 0} />
          </div>

          <div
            onClick={toggleVoting}
            style={{
              marginTop: 16,
              height: 50,
              borderRadius: 15,
              background: open ? C5.rust : C5.green,
              color: C5.onBrand,
              boxShadow: open ? "0 0 24px rgba(var(--rk-rust-rgb),.35)" : "0 0 24px rgba(var(--rk-green-rgb),.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {open && <span style={{ width: 7, height: 7, borderRadius: "50%", background: C5.onBrand, flex: "none" }} />}
            {open ? "Close voting & settle scores" : "Open voting window"}
          </div>
        </div>

        <div style={{ margin: "14px 24px 0", borderRadius: 16, background: ink(0.04), padding: "12px 14px", fontSize: 11.5, color: ink(0.55), lineHeight: 1.5 }}>
          Opening the window posts a card to the team chat and notifies everyone.
        </div>

        {hasResults && (
          <div style={{ margin: "18px 24px 0" }}>
            <MonoLabel size={9.5} weight={600} tone={0.5}>
              RESULTS · LAST WINDOW
            </MonoLabel>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
              {sortedResults.map((r) => {
                const p = vm.byId(r.playerId);
                return (
                  <div
                    key={r.playerId}
                    style={{
                      borderRadius: 14,
                      background: C5.card,
                      border: `1px solid ${ink(0.1)}`,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p?.name ?? "Player"}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, color: ink(0.5) }}>
                      {r.ovrBefore} → {r.ovrAfter}
                    </span>
                    <DeltaChip delta={r.delta} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
