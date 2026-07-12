/*
 * /rondo/preview — developer harness for the Pitchside v2 app (phases 3–4).
 * Renders the seed-driven manager and player surfaces with a role toggle so both
 * are reviewable and screenshot-able before they are wired to live data + real
 * role gating (phase 5). Not linked from the app.
 */
"use client";

import * as React from "react";
import "../../../styles/rondo-kit.css";
import { ManagerApp } from "@/components/rondo/manager-app";
import { PlayerApp } from "@/components/rondo/player-app";

export default function RondoPreviewPage() {
  const [role, setRole] = React.useState<"manager" | "player">("manager");
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          gap: 2,
          padding: 3,
          borderRadius: 999,
          background: "rgba(16,21,17,.85)",
          fontFamily: "var(--font-jbmono), ui-monospace, monospace",
        }}
      >
        {(["manager", "player"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              background: role === r ? "#F2F4F1" : "transparent",
              color: role === r ? "#101511" : "rgba(242,244,241,.7)",
            }}
          >
            {r}
          </button>
        ))}
      </div>
      {role === "manager" ? <ManagerApp /> : <PlayerApp />}
    </div>
  );
}
