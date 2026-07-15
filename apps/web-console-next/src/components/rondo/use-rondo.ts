/*
 * useRondo — the prototype's `Component` state machine + `renderVals` computed
 * view-model, ported to a React hook. State shape and transitions mirror
 * design-reference.md §B verbatim so behaviour matches the source. Screens are
 * pure functions of the returned view-model; all mutations go through actions.
 *
 * `seed` lets a host swap in live roster/team data (RX2+) while keeping the same
 * shape; when omitted the hook runs fully on the seed roster (demo mode).
 */
"use client";

import * as React from "react";
import {
  AVAIL_META,
  balance,
  initials,
  posColor,
  SEED_PLAYERS,
  SEED_TEAMS,
  shortName,
  skillsFor,
  tierOf,
  type Availability,
  type Goal,
  type Player,
  type Screen,
  type TeamMeta,
} from "./logic";

/** A recent-results row for the Fixtures screen, from the live matches API. */
export interface LiveMatchRow {
  id: string;
  dateLabel: string;
  score: string;
  color: string;
  status?: string;
  venue?: string | null;
  mapsUrl?: string | null;
}

/** The next actionable fixture (scheduled or live) — manager start/save target. */
export interface NextMatch {
  id: string;
  status: string;
  dateLabel: string;
  scheduledAt?: string;
  venue?: string | null;
  mapsUrl?: string | null;
}

/** A team line-up payload for persisting a draft onto a fixture. */
export interface TeamPayload {
  name: string;
  players: { id: string; name: string; position: string; rating: number }[];
}

/** Per-player record (appearances + results) shown on the stats view. */
export interface PlayerStats {
  apps: number;
  wins: number;
  draws: number;
  losses: number;
}

/** Live backend handlers. When present, actions hit the real API; otherwise the
 *  hook runs fully on local state (demo mode). */
export interface RondoLive {
  setAvailability?: (playerId: string, state: Availability) => void;
  draft?: (playerIds: string[], teamSize: number) => Promise<{ homeIds: string[]; awayIds: string[] } | null>;
  schedule?: (payload: {
    scheduledAt: string;
    venue: { name: string | null; address: string | null; booked: boolean; mapsUrl: string | null };
  }) => Promise<boolean>;
  setCaptain?: (playerId: string) => void;
  releasePlayer?: (playerId: string) => void;
  approveJoin?: (requestId: string) => void;
  declineJoin?: (requestId: string) => void;
  /** Persist the caller's per-skill star votes (1-5) for a player. */
  castVotes?: (playerId: string, votes: Record<string, number>) => void;
  /** Add a player to the roster with a default strength + optional email. */
  addPlayer?: (input: { name: string; position: string; email?: string | null; phone?: string | null }) => void;
  /** Leave the current squad (self-removal); the host redirects afterwards. */
  leaveTeam?: () => void;
  /** Open the manager-gated voting window (optionally resetting scores). */
  openRound?: (resetScores: boolean) => void;
  /** Close the voting window. */
  closeRound?: () => void;
  /** Mint a fresh shareable join code (also mints the first one if none). */
  rotateCode?: () => void;
  /** Persist a player's per-skill attributes (the OVR is the server-side mean). */
  setPlayerScore?: (playerId: string, attributes: Record<string, number>) => void;
  /** Kick a scheduled match off now (manager) → status 'live'. */
  startMatch?: (matchId: string) => void;
  /** Persist the drafted line-ups onto a scheduled fixture. */
  saveTeams?: (matchId: string, teamA: TeamPayload, teamB: TeamPayload) => void;
  /** Record the final score → status 'played'. */
  recordResult?: (matchId: string, scoreA: number, scoreB: number) => void;
  /** Claim a roster player as yourself (email must match). Resolves true on success. */
  claimPlayer?: (playerId: string) => Promise<boolean>;
  /** Set the caller's own availability (for their claimed player). */
  setMyAvailability?: (state: Availability) => void;
  /** Toggle whether a player has paid for the current match's pitch. */
  setPayment?: (playerId: string, paid: boolean) => void;
}

export interface LiveJoinRequest {
  id: string;
  name: string;
  via: string;
}

export interface RondoSeed {
  players?: Player[];
  teams?: TeamMeta[];
  teamName?: string;
  accent?: string;
  showCardStats?: boolean;
  startScreen?: Screen;
  availability?: Record<string, Availability>;
  availabilityAt?: Record<string, string>;
  matches?: LiveMatchRow[];
  nextMatch?: NextMatch | null;
  playerStats?: Record<string, PlayerStats>;
  /** The caller's own claimed player id (self-service availability), or null. */
  myPlayerId?: string | null;
  /** playerId → paid, for the current match's pitch-fee ledger. */
  payments?: Record<string, boolean>;
  joinCode?: string;
  joinRequests?: LiveJoinRequest[];
  votingOpen?: boolean;
  live?: RondoLive;
}

const nextAvail: Record<Availability, Availability> = { in: "out", out: "maybe", maybe: "in" };

const DEMO_AVAILABILITY: Record<string, Availability> = {
  p1: "in", p2: "in", p3: "in", p4: "in", p5: "maybe", p6: "in",
  p7: "in", p8: "out", p9: "in", p10: "in", p11: "maybe", p12: "in",
};

export function useRondo(seed: RondoSeed = {}) {
  const accent = seed.accent ?? "#56C98D";
  const teamName = seed.teamName ?? "Northside FC";
  const showCardStats = seed.showCardStats ?? true;
  const basePlayers = seed.players ?? SEED_PLAYERS;
  const teamsData = seed.teams ?? SEED_TEAMS;

  const [screen, setScreen] = React.useState<Screen>(seed.startScreen ?? "login");
  const [players, setPlayers] = React.useState<Player[]>(basePlayers);
  const [rated, setRated] = React.useState<string[]>(["p3", "p6", "p9"]);
  const [homeIds, setHomeIds] = React.useState<string[] | null>(null);
  const [awayIds, setAwayIds] = React.useState<string[] | null>(null);
  const [swapSel, setSwapSel] = React.useState<string[]>([]);
  const [voteTarget, setVoteTarget] = React.useState<string | null>(null);
  const [scorer, setScorer] = React.useState<"home" | "away" | null>(null);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [motmId, setMotmId] = React.useState<string | null>(null);
  const [turf, setTurf] = React.useState("astro");
  const [currentTeam, setCurrentTeam] = React.useState(teamsData[0]?.id ?? "northside");
  const [showTeams, setShowTeams] = React.useState(false);
  const [teamSize, setTeamSize] = React.useState(7);
  const [availability, setAvailability] = React.useState<Record<string, Availability>>(
    seed.availability ?? DEMO_AVAILABILITY,
  );
  const [membersRemoved, setMembersRemoved] = React.useState<string[]>([]);
  const [invitesResolved, setInvitesResolved] = React.useState<Record<string, "accepted" | "declined">>({});
  const [seq, setSeq] = React.useState(0); // deterministic id source (no Date.now in render)
  const [paymentsLocal, setPaymentsLocal] = React.useState<Record<string, boolean>>({});

  const go = React.useCallback((s: Screen) => setScreen(s), []);
  const availOf = React.useCallback((id: string): Availability => availability[id] ?? "in", [availability]);

  const cycleAvail = (id: string) =>
    setAvailability((a) => {
      const next = nextAvail[a[id] ?? "in"];
      seed.live?.setAvailability?.(id, next); // persist optimistically
      return { ...a, [id]: next };
    });

  const makeCaptain = (id: string) => {
    setPlayers((ps) => ps.map((p) => ({ ...p, isCaptain: p.id === id })));
    seed.live?.setCaptain?.(id);
  };

  const releasePlayer = (id: string) => {
    setPlayers((ps) => ps.filter((p) => p.id !== id));
    seed.live?.releasePlayer?.(id);
  };

  const clampSkill = (v: number) => Math.max(1, Math.min(99, Math.round(v)));
  const ovrOf = (skills: Record<string, number>) => {
    const vals = Object.values(skills);
    return vals.length ? clampSkill(vals.reduce((a, b) => a + b, 0) / vals.length) : 1;
  };
  const setPlayerScore = (id: string, skills: Record<string, number>) => {
    const clamped: Record<string, number> = {};
    for (const [k, v] of Object.entries(skills)) clamped[k] = clampSkill(v);
    setPlayers((ps) => ps.map((p) => (p.id === id ? { ...p, skills: clamped, ovr: ovrOf(clamped) } : p)));
    seed.live?.setPlayerScore?.(id, clamped);
  };

  const selectTeam = (id: string) => {
    setCurrentTeam(id);
    setShowTeams(false);
    setScreen("squad");
    setHomeIds(null);
    setAwayIds(null);
  };

  const [drafting, setDrafting] = React.useState(false);
  const doBalance = () => {
    const localBalance = () => {
      const { homeIds: h, awayIds: a } = balance(players, availOf, teamSize);
      setHomeIds(h);
      setAwayIds(a);
      setSwapSel([]);
    };
    if (seed.live?.draft) {
      const availableIds = players.filter((p) => availOf(p.id) === "in").map((p) => p.id);
      setDrafting(true);
      seed.live
        .draft(availableIds, teamSize)
        .then((res) => {
          if (res) {
            setHomeIds(res.homeIds);
            setAwayIds(res.awayIds);
            setSwapSel([]);
          } else {
            localBalance(); // server draft unavailable → deterministic local split
          }
        })
        .catch(() => localBalance())
        .finally(() => setDrafting(false));
      return;
    }
    localBalance();
  };

  const toggleSwap = (id: string) => {
    setSwapSel((prev) => {
      const sel = [...prev];
      const i = sel.indexOf(id);
      if (i >= 0) sel.splice(i, 1);
      else if (sel.length < 2) sel.push(id);
      if (sel.length === 2) {
        const a = sel[0]!;
        const b = sel[1]!;
        setHomeIds((hs) => {
          if (!hs || !awayIds) return hs;
          if (hs.includes(a) === hs.includes(b)) return hs;
          return hs.map((x) => (x === a ? b : x === b ? a : x));
        });
        setAwayIds((as) => {
          if (!as || !homeIds) return as;
          if (homeIds.includes(a) === homeIds.includes(b)) return as;
          return as.map((x) => (x === a ? b : x === b ? a : x));
        });
        return [];
      }
      return sel;
    });
  };

  const setVote = (skill: string, val: number) =>
    setPlayers((ps) => ps.map((p) => (p.id === voteTarget ? { ...p, myStars: { ...p.myStars, [skill]: val } } : p)));

  const submitVote = () => {
    if (voteTarget) {
      // Persist only the skills the voter actually rated (integer stars 1-5).
      const target = players.find((p) => p.id === voteTarget);
      const votes: Record<string, number> = {};
      if (target) {
        for (const [skill, val] of Object.entries(target.myStars)) {
          if (typeof val === "number" && val >= 1 && val <= 5) votes[skill] = Math.round(val);
        }
      }
      if (Object.keys(votes).length > 0) seed.live?.castVotes?.(voteTarget, votes);
      setRated((r) => Array.from(new Set([...r, voteTarget])));
    }
    setVoteTarget(null);
  };

  const pickScorer = (p: Player) => {
    const n = goals.length;
    const min = Math.min(89, 7 + n * 11 + (n % 2 ? 4 : 0));
    setGoals((g) => [...g, { id: `g${seq}`, team: scorer!, name: p.name, min }]);
    setSeq((s) => s + 1);
    setScorer(null);
  };

  const setMotm = (id: string) => setMotmId((m) => (m === id ? null : id));

  // ---- computed view-model (mirrors renderVals) ----
  const enrich = (p: Player) => {
    const t = tierOf(p.ovr);
    return {
      ...p,
      tierAccent: t.accent,
      cardBg: t.bg,
      tierLabel: t.label,
      initials: initials(p.name),
      shortName: shortName(p.name),
      posColor: posColor(p.pos),
      statList: Object.entries(p.skills).map(([k, v]) => ({ k, v })),
    };
  };
  type EP = ReturnType<typeof enrich>;
  const enriched = players.map(enrich);
  const byId = (id: string): EP | undefined => enriched.find((p) => p.id === id);

  const activeTeam = (teamsData.find((t) => t.id === currentTeam) ?? teamsData[0])!;
  const isManager = activeTeam.role === "Manager";
  const activeTeamName = activeTeam.id === "northside" ? teamName : activeTeam.name;

  const availableCount = players.filter((p) => availOf(p.id) === "in").length;
  const maybeCount = players.filter((p) => availOf(p.id) === "maybe").length;
  const outCount = players.filter((p) => availOf(p.id) === "out").length;

  // Waitlist: the first `capacity` (= two sides) "in" players are confirmed in
  // RSVP order (earliest first); the rest wait. As anyone drops out the split
  // recomputes, so a freed spot auto-promotes the next waitlisted player.
  const capacity = teamSize * 2;
  const availAt = seed.availabilityAt ?? {};
  const inOrdered = enriched
    .filter((p) => availOf(p.id) === "in")
    .map((p, i) => ({ p, i, t: availAt[p.id] ? Date.parse(availAt[p.id]!) : Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => (a.t !== b.t ? a.t - b.t : a.i - b.i))
    .map((x) => x.p);
  const confirmedPlayers = inOrdered.slice(0, capacity);
  const waitlistPlayers = inOrdered.slice(capacity);

  const balanced = !!homeIds && !!awayIds;
  const home: EP[] = balanced ? (homeIds as string[]).map(byId).filter(Boolean) as EP[] : [];
  const away: EP[] = balanced ? (awayIds as string[]).map(byId).filter(Boolean) as EP[] : [];
  const homeAvg = home.length ? Math.round(home.reduce((x, p) => x + p.ovr, 0) / home.length) : 0;
  const awayAvg = away.length ? Math.round(away.reduce((x, p) => x + p.ovr, 0) / away.length) : 0;
  const balanceGap = Math.abs(homeAvg - awayAvg);

  const homeScore = goals.filter((g) => g.team === "home").length;
  const awayScore = goals.filter((g) => g.team === "away").length;
  const matchMin = Math.min(90, 34 + goals.length * 8);

  const voteTargetP = voteTarget ? enrich(players.find((p) => p.id === voteTarget)!) : null;
  const voteSkills = voteTargetP ? skillsFor(voteTargetP.pos) : [];

  return {
    // config
    accent,
    teamName,
    showCardStats,
    // raw state
    screen,
    players: enriched,
    rated,
    homeIds,
    awayIds,
    swapSel,
    voteTarget,
    voteTargetP,
    voteSkills,
    scorer,
    goals,
    motmId,
    turf,
    currentTeam,
    showTeams,
    teamSize,
    availability,
    availOf,
    membersRemoved,
    invitesResolved,
    // derived
    teamsData,
    activeTeam,
    isManager,
    activeTeamName,
    availableCount,
    maybeCount,
    outCount,
    capacity,
    confirmedPlayers,
    waitlistPlayers,
    balanced,
    home,
    away,
    homeAvg,
    awayAvg,
    balanceGap,
    homeScore,
    awayScore,
    matchMin,
    ratedCount: rated.length,
    totalRatable: players.length,
    byId,
    // live
    drafting,
    isLive: !!seed.live,
    liveMatches: seed.matches ?? null,
    nextMatch: seed.nextMatch ?? null,
    playerStats: seed.playerStats ?? {},
    myPlayerId: seed.myPlayerId ?? null,
    myAvailability: seed.myPlayerId ? availOf(seed.myPlayerId) : null,
    canSelfRSVP: !!seed.myPlayerId && !!seed.live?.setMyAvailability,
    canClaim: !seed.myPlayerId && !!seed.live?.claimPlayer,
    setMyAvailability: (state: Availability) => {
      const id = seed.myPlayerId;
      if (!id) return;
      setAvailability((a) => ({ ...a, [id]: state }));
      seed.live?.setMyAvailability?.(state);
    },
    claimPlayer: (playerId: string) => seed.live?.claimPlayer?.(playerId) ?? Promise.resolve(false),
    payments: { ...(seed.payments ?? {}), ...paymentsLocal },
    canManagePayments: !!seed.live?.setPayment && !!seed.nextMatch,
    setPayment: (playerId: string, paid: boolean) => {
      setPaymentsLocal((m) => ({ ...m, [playerId]: paid }));
      seed.live?.setPayment?.(playerId, paid);
    },
    startMatch: () => {
      const id = seed.nextMatch?.id;
      if (id) seed.live?.startMatch?.(id);
    },
    canStartMatch: !!seed.live?.startMatch && (seed.nextMatch?.status === "scheduled"),
    saveTeams: () => {
      const id = seed.nextMatch?.id;
      if (!id || !seed.live?.saveTeams) return;
      const toPayload = (name: string, list: typeof home): TeamPayload => ({
        name,
        players: list.map((p) => ({ id: p.id, name: p.name, position: p.pos, rating: p.ovr })),
      });
      if (home.length && away.length) seed.live.saveTeams(id, toPayload("Home", home), toPayload("Away", away));
    },
    canSaveTeams: !!seed.live?.saveTeams && !!seed.nextMatch,
    recordResult: (scoreA: number, scoreB: number) => {
      const id = seed.nextMatch?.id;
      if (id) seed.live?.recordResult?.(id, Math.max(0, Math.round(scoreA)), Math.max(0, Math.round(scoreB)));
    },
    canRecordResult: !!seed.live?.recordResult && !!seed.nextMatch,
    onSchedule: seed.live?.schedule ?? null,
    captain: enriched.find((p) => p.isCaptain) ?? null,
    makeCaptain,
    releasePlayer,
    setPlayerScore,
    canEditScore: !!seed.live?.setPlayerScore,
    joinCode: seed.joinCode ?? null,
    rotateCode: () => seed.live?.rotateCode?.(),
    canManageCode: !!seed.live?.rotateCode,
    joinRequests: seed.joinRequests ?? null,
    addPlayer: (input: { name: string; position: string; email?: string | null; phone?: string | null }) => {
      seed.live?.addPlayer?.(input);
    },
    leaveTeam: () => {
      seed.live?.leaveTeam?.();
    },
    canLeave: !!seed.live?.leaveTeam,
    // Rating window: demo mode has no round gating (always open); live mode
    // reflects the org's real round and exposes manager open/close controls.
    votingOpen: seed.votingOpen ?? !seed.live,
    canManageRound: isManager && !!seed.live?.openRound,
    openRound: (resetScores: boolean) => seed.live?.openRound?.(resetScores),
    closeRound: () => seed.live?.closeRound?.(),
    approveJoin: (id: string) => {
      setInvitesResolved((r) => ({ ...r, [id]: "accepted" }));
      seed.live?.approveJoin?.(id);
    },
    declineJoin: (id: string) => {
      setInvitesResolved((r) => ({ ...r, [id]: "declined" }));
      seed.live?.declineJoin?.(id);
    },
    // actions
    go,
    setScreen,
    selectTeam,
    cycleAvail,
    setTeamSize,
    doBalance,
    toggleSwap,
    setVote,
    submitVote,
    setVoteTarget,
    setScorer,
    pickScorer,
    setMotm,
    setTurf,
    setShowTeams,
    setMembersRemoved,
    setInvitesResolved,
    setGoals,
    setMotmId,
  };
}

export type RondoVM = ReturnType<typeof useRondo>;
export { AVAIL_META };
