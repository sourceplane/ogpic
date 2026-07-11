/*
 * Rondo FUT-style player card (RX0 signature primitive). Measurements from
 * design-reference.md §E; tier gradient + numeral color from `tierOf`, position
 * color from `posColor` (logic.ts). `showStats` toggles the 3×2 attribute grid.
 */
"use client";

import * as React from "react";
import { Mono } from "./ui";

export interface CardPlayer {
  ovr: number;
  pos: string;
  name: string;
  initials: string;
  tierAccent: string;
  cardBg: string;
  tierLabel: string;
  posColor: string;
  statList: { k: string; v: number }[];
  isCaptain?: boolean;
}

export function PlayerCard({ p, showStats = true }: { p: CardPlayer; showStats?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: "13px 12px 11px",
        background: p.cardBg,
        border: "1px solid rgba(255,255,255,.08)",
        overflow: "hidden",
        boxShadow: "0 8px 22px -12px rgba(0,0,0,.7)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 16, right: 16, height: 2, background: p.tierAccent, borderRadius: 2 }} />
      {p.isCaptain && (
        <div style={{ position: "absolute", top: 9, right: 10, width: 18, height: 18, borderRadius: "50%", background: "rgba(86,201,141,.18)", border: "1px solid rgba(86,201,141,.45)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#56C98D" }} title="Captain">Ⓒ</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 0.85, color: p.tierAccent, letterSpacing: "-1.5px" }}>
            {p.ovr}
          </div>
          <Mono style={{ fontSize: 10, fontWeight: 700, color: p.posColor, marginTop: 3, letterSpacing: ".5px", display: "block" }}>
            {p.pos}
          </Mono>
          <Mono style={{ fontSize: 8, color: "#7c7f85", marginTop: 3, letterSpacing: "1px", display: "block" }}>
            {p.tierLabel}
          </Mono>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background:
              "repeating-linear-gradient(45deg,rgba(255,255,255,.05),rgba(255,255,255,.05) 4px,rgba(0,0,0,.15) 4px,rgba(0,0,0,.15) 8px)",
            border: "1px solid rgba(255,255,255,.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            color: "#E7E5E0",
          }}
        >
          {p.initials}
        </div>
      </div>
      {showStats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "3px 4px",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,.1)",
          }}
        >
          {p.statList.map((st) => (
            <div key={st.k} style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: "center" }}>
              <Mono style={{ fontSize: 8.5, color: "#8b8e94" }}>{st.k}</Mono>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#E7E5E0" }}>{st.v}</span>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          marginTop: 10,
          fontSize: 12.5,
          fontWeight: 800,
          color: "#F4F3F0",
          textAlign: "center",
          letterSpacing: "-.2px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {p.name}
      </div>
    </div>
  );
}
