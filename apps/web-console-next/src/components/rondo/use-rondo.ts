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
  venue?: string | null;
}

/** Live backend handlers. When present, actions hit the real API; otherwise the
 *  hook runs fully on local state (demo mode). */
export interface RondoLive {
  setAvailability?: (playerId: string, state: Availability) => void;
  draft?: (playerIds: string[], teamSize: number) => Promise<{ homeIds: string[]; awayIds: string[] } | null>;
  schedule?: (payload: {
    scheduledAt: string;
    venue: { name: string | null; address: string | null; booked: boolean };
  }) => Promise<boolean>;
  setCaptain?: (playerId: string) => void;
  releasePlayer?: (playerId: string) => void;
  approveJoin?: (requestId: string) => void;
  declineJoin?: (requestId: string) => void;
  /** Persist the caller's per-skill star votes (1-5) for a player. */
  castVotes?: (playerId: string, votes: Record<string, number>) => void;
  /** Add a player to the roster with a default strength + optional email. */
  addPlayer?: (input: { name: string; position: string; email?: string | null }) => void;
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
  matches?: LiveMatchRow[];
  joinCode?: string;
  joinRequests?: LiveJoinRequest[];
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
    onSchedule: seed.live?.schedule ?? null,
    captain: enriched.find((p) => p.isCaptain) ?? null,
    makeCaptain,
    releasePlayer,
    joinCode: seed.joinCode ?? null,
    joinRequests: seed.joinRequests ?? null,
    addPlayer: (input: { name: string; position: string; email?: string | null }) => {
      seed.live?.addPlayer?.(input);
    },
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
