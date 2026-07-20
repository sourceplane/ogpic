/*
 * RondoApp5 — the v5 night-pitch shell. One screen-state machine per role,
 * the floating dock, sheet state (plus / invite / add-player), toasts, and
 * every v5 screen mounted by state. Screens with a target use the
 * "<screen>:<id>" param convention ("mdetail:<matchId>", "edit:<playerId>",
 * "pdetail:<matchId>"). Team switching ("hub") reuses the existing
 * TeamSwitcher sheet so route-level team flows (/rondo, /rondo/new,
 * /rondo/join) keep working unchanged.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "@saas/rondo-core";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { C5, DockNav, useToast, type DockItem } from "./kit5";
import { Anim5Styles, ScreenTransition, useSwipeBack, type NavDirection } from "./anim5";
import { MHome } from "./m-home";
import { MMatches } from "./m-matches";
import { MWizard } from "./m-wizard";
import { MDetail } from "./m-detail";
import { MSquad } from "./m-squad";
import { MEdit } from "./m-edit";
import { MRate } from "./m-rate";
import { MProfile } from "./m-profile";
import { ChatScreen } from "./chat-screen";
import { PlusSheet, InviteSheet, AddPlayerSheet5 } from "./sheets5";
import { PHome } from "./p-home";
import { PMatches } from "./p-matches";
import { PDetail } from "./p-detail";
import { PRate } from "./p-rate";
import { PSquad } from "./p-squad";
import { PPlayerView } from "./p-player-view";
import { PProfile } from "./p-profile";
import { PClaim } from "./p-claim";
import type { TeamNav } from "../team-switcher";
import { Hub5 } from "./hub5";

const MANAGER_DOCK: readonly { key: string; label: string; icon: DockItem["icon"] }[] = [
  { key: "home", label: "HOME", icon: "home" },
  { key: "matches", label: "MATCHES", icon: "matchesBall" },
  { key: "chat", label: "CHAT", icon: "chat" },
  { key: "squad", label: "SQUAD", icon: "squad" },
];

const PLAYER_DOCK: readonly { key: string; label: string; icon: DockItem["icon"] }[] = [
  { key: "home", label: "HOME", icon: "home" },
  { key: "matches", label: "MATCHES", icon: "matchesBall" },
  { key: "chat", label: "CHAT", icon: "chat" },
  { key: "rate", label: "RATE", icon: "star" },
];

/** Push/pop direction hint for ScreenTransition (spec §Integration). "Deep"
 *  screens are the pushed detail/edit/wizard surfaces; the dock tabs sit at
 *  depth 0. Going deeper animates forward; returning to a tab (or a lower
 *  dock-order tab) animates back. Purely presentational — it never changes
 *  which screen renders. */
const DEEP_SCREENS = new Set(["mdetail", "pdetail", "edit", "pview", "wizard", "hub", "profile", "psquad"]);
const DOCK_ORDER = ["home", "matches", "chat", "squad", "rate"];

/** Back-navigation target per push screen, for the swipe-back gesture — each
 *  is the exact `nav(...)` those screens already fire from their header back
 *  button, so the gesture pops to the same place with no behaviour change.
 *  (Wizard's header back is step-aware; an edge-swipe is a screen-level exit
 *  to Matches, matching its final back step.) */
const BACK_TARGET: Record<string, string> = {
  mdetail: "matches",
  pdetail: "matches",
  edit: "squad",
  pview: "psquad",
  wizard: "matches",
};

/** Dock keys that show the dock; param screens map to their base tab. */
function dockKeyOf(screen: string): string {
  const base = screen.split(":")[0]!;
  if (base === "mdetail" || base === "pdetail" || base === "wizard") return "matches";
  if (base === "edit") return "squad";
  // PSquad/PPlayerView are player push-screens reached from Home/Rate, not a
  // dock tab of their own (the player dock stays HOME/MATCHES/CHAT/RATE) —
  // Home is the closest tab while either is open.
  if (base === "psquad" || base === "pview") return "home";
  return base;
}

export function RondoApp5({
  vm,
  role,
  teamNav,
}: {
  vm: RondoVM;
  role: "manager" | "player";
  teamNav?: TeamNav | undefined;
}) {
  const [screen, setScreen] = React.useState("home");
  const [claimDismissed, setClaimDismissed] = React.useState(false);
  const [plusOpen, setPlusOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const { toast, node: toastNode } = useToast();
  const router = useRouter();
  const { client, setToken } = useSession();

  const nav = React.useCallback((s: string) => {
    setClaimDismissed(true);
    setScreen(s);
  }, []);

  const onSignOut = React.useCallback(async () => {
    try {
      await client.auth.logout();
    } catch {
      /* session may already be gone */
    }
    setToken(null);
    router.push("/rondo");
  }, [client, setToken, router]);

  const [base, param] = React.useMemo(() => {
    const i = screen.indexOf(":");
    return i === -1 ? [screen, ""] : [screen.slice(0, i), screen.slice(i + 1)];
  }, [screen]);

  // Push/pop direction for the screen transition, derived from the previous vs
  // next screen (no change to the state machine — `screen`/`setScreen` are the
  // same). `prevScreenRef` trails by one commit so the memo sees the outgoing
  // screen at transition time.
  const prevScreenRef = React.useRef(screen);
  const direction = React.useMemo<NavDirection>(() => {
    const prevBase = prevScreenRef.current.split(":")[0] ?? prevScreenRef.current;
    const nextBase = screen.split(":")[0] ?? screen;
    const prevDepth = DEEP_SCREENS.has(prevBase) ? 1 : 0;
    const nextDepth = DEEP_SCREENS.has(nextBase) ? 1 : 0;
    if (nextDepth > prevDepth) return "forward";
    if (nextDepth < prevDepth) return "back";
    const pi = DOCK_ORDER.indexOf(prevBase);
    const ni = DOCK_ORDER.indexOf(nextBase);
    if (pi >= 0 && ni >= 0 && ni < pi) return "back";
    return "forward";
  }, [screen]);
  React.useEffect(() => {
    prevScreenRef.current = screen;
  }, [screen]);

  // Interactive edge-swipe-back on push screens — calls the same back nav their
  // header button already uses (never a new destination).
  const backTarget = BACK_TARGET[base];
  const onSwipeBack = React.useCallback(() => {
    if (backTarget) nav(backTarget);
  }, [backTarget, nav]);
  const swipe = useSwipeBack(onSwipeBack, backTarget !== undefined);

  // Dock badges: RATE ! while the voting window is open; MATCHES ! while a
  // poll still needs the viewer's vote (design reference lines 1154-1156).
  const pollNeedsVote = Object.values(vm.polls).some((p) => !p.closedAt && !p.myPlayerVoted);
  const dockItems: DockItem[] = (role === "manager" ? MANAGER_DOCK : PLAYER_DOCK).map((d) => ({
    ...d,
    badge: role === "player" && ((d.key === "rate" && !!vm.votingOpen) || (d.key === "matches" && pollNeedsVote)),
  }));

  const openInvite = React.useCallback(() => setInviteOpen(true), []);
  const openAdd = React.useCallback(() => setAddOpen(true), []);

  let body: React.ReactNode = null;
  if (base === "hub") {
    // The v5 "Your teams" hub — every squad with role chips (design 54-88).
    body = (
      <Hub5
        teams={(teamNav?.teams ?? []).map((t) => ({ slug: t.slug, name: t.name, role: t.role }))}
        currentSlug={teamNav?.currentSlug}
        onOpen={(slug) => teamNav?.onSelect(slug)}
        onCreate={() => teamNav?.onCreate()}
        onJoin={() => teamNav?.onJoin()}
      />
    );
  } else if (role === "manager") {
    if (base === "home") body = <MHome vm={vm} nav={nav} toast={toast} onInvite={openInvite} />;
    else if (base === "matches") body = <MMatches vm={vm} nav={nav} toast={toast} />;
    else if (base === "wizard") body = <MWizard vm={vm} nav={nav} toast={toast} />;
    else if (base === "mdetail") body = <MDetail vm={vm} nav={nav} toast={toast} matchId={param} />;
    else if (base === "chat")
      body = <ChatScreen vm={vm} nav={nav} toast={toast} role="manager" onInvite={openInvite} onPlus={() => setPlusOpen(true)} />;
    else if (base === "squad") body = <MSquad vm={vm} nav={nav} toast={toast} onAdd={openAdd} onInvite={openInvite} />;
    else if (base === "edit") body = <MEdit vm={vm} nav={nav} toast={toast} playerId={param} />;
    else if (base === "rate") body = <MRate vm={vm} nav={nav} toast={toast} />;
    else if (base === "profile") body = <MProfile vm={vm} nav={nav} toast={toast} onInvite={openInvite} onSignOut={onSignOut} />;
    else body = <MHome vm={vm} nav={nav} toast={toast} onInvite={openInvite} />;
  } else if (vm.canClaim && !claimDismissed) {
    // A signed-in player matching an unclaimed roster profile claims it first —
    // self-service (voting, drop-outs, ratings) hangs off the claimed player.
    body = <PClaim vm={vm} nav={nav} toast={toast} />;
  } else {
    if (base === "home") body = <PHome vm={vm} nav={nav} toast={toast} />;
    else if (base === "matches") body = <PMatches vm={vm} nav={nav} toast={toast} />;
    else if (base === "pdetail") body = <PDetail vm={vm} nav={nav} toast={toast} matchId={param} />;
    else if (base === "chat") body = <ChatScreen vm={vm} nav={nav} toast={toast} role="player" onPlus={() => setPlusOpen(true)} />;
    else if (base === "rate") body = <PRate vm={vm} nav={nav} toast={toast} />;
    else if (base === "psquad") body = <PSquad vm={vm} nav={nav} toast={toast} />;
    else if (base === "pview") body = <PPlayerView vm={vm} nav={nav} toast={toast} playerId={param} />;
    else if (base === "profile") body = <PProfile vm={vm} nav={nav} toast={toast} onSignOut={onSignOut} />;
    else body = <PHome vm={vm} nav={nav} toast={toast} />;
  }

  return (
    <div style={{ minHeight: "100dvh", background: C5.surface, display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto", position: "relative" }}>
      <Anim5Styles />
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          {...swipe.handlers}
          style={{ position: "absolute", inset: 0, touchAction: backTarget !== undefined ? "pan-y" : undefined, ...swipe.style }}
        >
          <ScreenTransition screenKey={screen} direction={direction}>
            {body}
          </ScreenTransition>
        </div>
      </div>
      <DockNav items={dockItems} active={dockKeyOf(screen)} onSelect={(k) => setScreen(k)} />
      <PlusSheet
        vm={vm}
        open={plusOpen}
        onClose={() => setPlusOpen(false)}
        toast={toast}
        role={role}
        onPoll={() => {
          setPlusOpen(false);
          setScreen("wizard");
        }}
        onInvite={() => {
          setPlusOpen(false);
          setInviteOpen(true);
        }}
        onMyAvailability={() => {
          setPlusOpen(false);
          setScreen("matches");
        }}
      />
      <InviteSheet vm={vm} open={inviteOpen} onClose={() => setInviteOpen(false)} toast={toast} />
      <AddPlayerSheet5 vm={vm} open={addOpen} onClose={() => setAddOpen(false)} toast={toast} />
      {toastNode}
    </div>
  );
}
