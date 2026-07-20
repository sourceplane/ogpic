/*
 * MMatches — the manager's v5 "night-pitch" Matches list (design-reference
 * lines 165-185, spec §2 screen 4): header with `+ New match`, and a card per
 * `vm.liveMatches` row (label/subLabel, phase chip, progress bar, `POLL →
 * DRAFT → SCHEDULED` footer). Presentational — reads `vm.liveMatches`, calls
 * `nav` to the wizard or a match's detail screen.
 */
"use client";

import * as React from "react";
import type { MatchPhase, RondoVM } from "@saas/rondo-core";
import { C5, ink, MONO, PhaseChip, ProgressSteps } from "./kit5";
import { Pressable, Stagger } from "./anim5";

/** Progress-bar fill colour (spec §2 screen 4): gold through the poll
 *  pipeline, green once scheduled (or further); rust once cancelled. */
function progressColor(phase: MatchPhase): string {
  if (phase === "cancelled") return C5.rust;
  if (phase === "poll" || phase === "finalizing" || phase === "draft") return C5.gold;
  return C5.green;
}

export function MMatches({ vm, nav }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const rows = vm.liveMatches ?? [];

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flex: "none" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>Matches</span>
        <div
          onClick={() => nav("wizard")}
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: 12,
            background: C5.ink,
            color: C5.surface,
            display: "flex",
            alignItems: "center",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + New match
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && (
          <div style={{ fontSize: 13, color: ink(0.5), textAlign: "center", marginTop: 40 }}>
            No matches yet — start one to poll the squad.
          </div>
        )}
        <Stagger style={{ flex: "none" }}>
          {rows.map((m) => {
            const color = progressColor(m.phase);
            return (
              <Pressable
                key={m.id}
                onClick={() => nav(`mdetail:${m.id}`)}
                style={{ borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: "15px 16px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C5.ink, flex: 1 }}>{m.label}</span>
                  <PhaseChip phase={m.phase} />
                </div>
                <div style={{ fontSize: 12, color: ink(0.55), marginTop: 4 }}>{m.subLabel}</div>
                <div style={{ marginTop: 10 }}>
                  <ProgressSteps percent={m.progressStep} color={color} />
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: ink(0.4) }}>POLL → DRAFT → SCHEDULED</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color }}>{m.progressStep}%</span>
                </div>
              </Pressable>
            );
          })}
        </Stagger>
      </div>
    </div>
  );
}
