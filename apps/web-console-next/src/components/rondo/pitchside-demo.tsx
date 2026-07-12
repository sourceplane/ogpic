/*
 * PitchsideDemo — the token-free interactive preview of the Pitchside v2 app
 * (UI revamp). Renders the seed-driven manager and player surfaces with a role
 * toggle so the whole product loop is demoable without an API session. Used by
 * both /rondo/demo (the public preview) and /rondo/preview (the dev harness).
 */
"use client";

import * as React from "react";
import { ManagerApp } from "./manager-app";
import { PlayerApp } from "./player-app";

export function PitchsideDemo() {
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
