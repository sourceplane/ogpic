/*
 * PitchsideApp — the Rondo app shell. Builds the useRondo view-model from a seed
 * and renders the manager or player surface by role. Used by the authenticated
 * route (live seed + real role) and the token-free demo (canned seed + toggle).
 */
"use client";

import * as React from "react";
import { useRondo, type RondoSeed } from "./use-rondo";
import { ManagerApp } from "./manager-app";
import { PlayerApp } from "./player-app";
import { DEMO_SEED } from "./demo-seed";

export function PitchsideApp({ seed, role }: { seed: RondoSeed; role: "manager" | "player" }) {
  const vm = useRondo(seed);
  return role === "manager" ? <ManagerApp vm={vm} /> : <PlayerApp vm={vm} />;
}

/** Token-free demo: the same app on a canned seed, with a manager/player toggle. */
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
      <PitchsideApp seed={DEMO_SEED} role={role} />
    </div>
  );
}
