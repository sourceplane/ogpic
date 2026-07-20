/*
 * PitchsideApp — the Rondo app shell. Builds the useRondo view-model from a seed
 * and renders the manager or player surface by role. Used by the authenticated
 * route (live seed + real role) and the token-free demo (canned seed + toggle).
 */
"use client";

import * as React from "react";
import { useRondo, type RondoSeed } from "@saas/rondo-core";
import { RondoApp5 } from "./v5/app5";
import { DEMO_SEED } from "@saas/rondo-core";
import type { TeamNav } from "./team-switcher";

export function PitchsideApp({
  seed,
  role,
  teamNav,
}: {
  seed: RondoSeed;
  role: "manager" | "player";
  teamNav?: TeamNav;
}) {
  const vm = useRondo(seed);
  return <RondoApp5 vm={vm} role={role} teamNav={teamNav} />;
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
  const go = (path: string) => {
    if (typeof window !== "undefined") window.location.href = path;
  };
  const teamNav: TeamNav = {
    teams: [{ slug: "demo", name: "Northside FC", crest: "N" }],
    currentSlug: "demo",
    onSelect: () => {},
    onCreate: () => go("/rondo/new"),
    onJoin: () => go("/rondo/join"),
  };
  return <PitchsideApp seed={DEMO_SEED} role={role} teamNav={teamNav} />;
}
