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

/**
 * Token-free demo: the same app on a canned seed. Like the real app it shows a
 * single role — no on-screen switch (that was illustration). Defaults to the
 * manager surface; `?role=player` previews the player surface for review.
 */
export function PitchsideDemo() {
  const [role, setRole] = React.useState<"manager" | "player">("manager");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const r = new URLSearchParams(window.location.search).get("role");
    if (r === "player") setRole("player");
  }, []);
  return <PitchsideApp seed={DEMO_SEED} role={role} />;
}
