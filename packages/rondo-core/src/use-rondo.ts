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
  type MatchPhase,
  type Player,
  type PollDeadlineKind,
  type Screen,
  type TeamMeta,
} from "./logic";

/** A team line-up on a fixture row (name + player names + score). */
export interface MatchTeamRow {
  name: string;
  players: string[];
  rating: number;
}

/** A recent-results row for the Fixtures screen, from the live matches API. */
export interface LiveMatchRow {
  id: string;
  dateLabel: string;
  score: string;
  color: string;
  status?: string;
  venue?: string | null;
  mapsUrl?: string | null;
  teamA?: MatchTeamRow;
  teamB?: MatchTeamRow;
  /** v5: the match lifecycle phase (spec §3), for the Matches screen's phase
   *  chip + progress bar. */
  phase: MatchPhase;
  /** Progress-bar fill 0-100 (poll 33 / finalizing 55 / draft 75 / scheduled+ 100). */
  progressStep: number;
  /** Card headline (date + kickoff time, or a phase fallback pre-schedule). */
  label: string;
  /** Card sub-line (venue name, or a phase fallback when there's none yet). */
  subLabel: string;
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

/** Per-player record (appearances + results) shown on the stats view.
 *  `goals`/`motm` are v5 additions (spec §8): real zeros once computed from
 *  live data (per-player attribution isn't tracked yet), optional here only
 *  so a caller-supplied fallback stats object doesn't need to know about
 *  them. */
export interface PlayerStats {
  apps: number;
  wins: number;
  draws: number;
  losses: number;
  goals?: number;
  motm?: number;
}

// ── v5: match polls (spec §2 screen 6 poll/finalizing, §4 Polls, §7) ───────

/** One poll option (a time slot or a turf choice), enriched with whether the
 *  viewer's own claimed player voted for it. */
export interface PollOptionVM {
  id: string;
  label: string;
  detail: string | null;
  startsAt: string | null;
  votes: number;
  voterPlayerIds: string[];
  /** The viewer's claimed player voted for this option. */
  mine: boolean;
}

/** Per-match poll view (spec §7): the live/closed ballot for one match. */
export interface MatchPollVM {
  deadlineKind: PollDeadlineKind;
  deadlineAt: string | null;
  closedAt: string | null;
  times: PollOptionVM[];
  turfs: PollOptionVM[];
  votersPlayerIds: string[];
  /** Roster players who haven't voted yet. */
  waitingPlayerIds: string[];
  votedCount: number;
  eligible: number;
  /** The viewer's claimed player has voted (any option). */
  myPlayerVoted: boolean;
}

/** A poll option as carried on the seed — near-`MatchPollResponse.options[]`
 *  shape (`@saas/sdk`'s `PublicMatchPollOption`), before the `mine` flag is
 *  derived against the viewer's claimed player. */
export interface PollOptionSeed {
  id: string;
  kind: "time" | "turf";
  label: string;
  detail: string | null;
  startsAt: string | null;
  votes: number;
  voterPlayerIds: string[];
}

/** A match's poll payload as carried on the seed — near-`MatchPollResponse`
 *  shape (spec §4 `GET /matches/:id/poll`). */
export interface MatchPollSeed {
  deadlineKind: PollDeadlineKind;
  deadlineAt: string | null;
  closedAt: string | null;
  options: PollOptionSeed[];
  voters: string[];
  eligible: number;
}

function toPollOptionVM(o: PollOptionSeed, myPlayerId: string | null): PollOptionVM {
  return {
    id: o.id,
    label: o.label,
    detail: o.detail,
    startsAt: o.startsAt,
    votes: o.votes,
    voterPlayerIds: o.voterPlayerIds,
    mine: !!myPlayerId && o.voterPlayerIds.includes(myPlayerId),
  };
}

/** Seed poll payload → the VM's per-match poll view. Exported (rather than
 *  kept private to the hook) so it's independently unit-testable. */
export function buildMatchPollVM(seedPoll: MatchPollSeed, rosterPlayerIds: string[], myPlayerId: string | null): MatchPollVM {
  const voters = new Set(seedPoll.voters);
  return {
    deadlineKind: seedPoll.deadlineKind,
    deadlineAt: seedPoll.deadlineAt,
    closedAt: seedPoll.closedAt,
    times: seedPoll.options.filter((o) => o.kind === "time").map((o) => toPollOptionVM(o, myPlayerId)),
    turfs: seedPoll.options.filter((o) => o.kind === "turf").map((o) => toPollOptionVM(o, myPlayerId)),
    votersPlayerIds: seedPoll.voters,
    waitingPlayerIds: rosterPlayerIds.filter((id) => !voters.has(id)),
    votedCount: seedPoll.voters.length,
    eligible: seedPoll.eligible,
    myPlayerVoted: !!myPlayerId && voters.has(myPlayerId),
  };
}

// ── v5: squad chat (spec §2 screen 7, §4 Chat, §7) ─────────────────────────

export type ChatRowKind = "text" | "note" | "poll" | "sched";

/** A chat feed row, oldest→newest (the UI reverses for its scroll-up feed).
 *  `poll`/`sched` kinds carry `matchId` so the card can look up
 *  `polls[matchId]` / the matching fixture. */
export interface ChatRowVM {
  id: string;
  kind: ChatRowKind;
  body: string;
  matchId: string | null;
  authorName: string | null;
  /** From the viewer's own claimed player or account subject. */
  mine: boolean;
  reactions: Record<string, string[]>;
  createdAt: string;
}

/** A chat message as carried on the seed — near-`PublicChatMessage` shape
 *  (spec §4 Chat). */
export interface ChatMessageSeed {
  id: string;
  kind: ChatRowKind;
  body: string;
  matchId: string | null;
  authorPlayerId: string | null;
  authorSubjectId: string | null;
  authorName: string | null;
  reactions: Record<string, string[]>;
  createdAt: string;
}

// ── v5: dropouts (spec §2 match-detail scheduled/draft, §4 Dropouts, §7) ───

/** An unresolved drop-out a manager needs to act on. */
export interface OpenDropoutVM {
  playerId: string;
  playerName: string;
  reason: string;
  /** The highest-OVR available player not already in either team, or `null`
   *  when none is available (spec: "Replace with X (ovr)"). */
  suggestedReplacement: { id: string; name: string; ovr: number } | null;
}

/** Per-match drop-out view. */
export interface MatchDropoutVM {
  /** The viewer's own claimed player's drop-out, or `null` if they're in. */
  mine: { reason: string } | null;
  open: OpenDropoutVM[];
}

/** A match's drop-out payload as carried on the seed — already resolved to
 *  display-ready shape (names + suggested replacement) since deriving those
 *  needs the raw roster + team snapshots that only `live.ts` has. */
export interface MatchDropoutSeed {
  mine: { reason: string } | null;
  open: {
    playerId: string;
    playerName: string;
    reason: string;
    suggestedReplacement?: { id: string; name: string; ovr: number } | null;
  }[];
}

/** The manager Home banner for the squad's first open, unresolved drop-out. */
export interface OpenDropoutAlert {
  matchId: string;
  playerName: string;
  reason: string;
}

// ── v5: org settings (spec §4 Org settings, §7) ────────────────────────────

export interface OrgSettingsVM {
  whatsappBridge: boolean;
  setWhatsappBridge: (on: boolean) => Promise<{ ok: boolean; message?: string }>;
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
  /** Add a player to the roster with a default strength + optional email/phone.
   *  Resolves with the outcome so the UI can surface a failure. */
  addPlayer?: (input: { name: string; position: string; email?: string | null; phone?: string | null }) => Promise<{ ok: boolean; message?: string }>;
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
  saveTeams?: (matchId: string, teamA: TeamPayload, teamB: TeamPayload, opts?: { status?: "scheduled" }) => void;
  /** Record the final score → status 'played'. */
  recordResult?: (matchId: string, scoreA: number, scoreB: number) => void;
  /** Claim a roster player as yourself (email must match). Resolves true on success. */
  claimPlayer?: (playerId: string) => Promise<boolean>;
  /** "Claim mine": server-resolved self-service claim for a member with no
   *  claimable roster player yet (joined by code). Finds/creates one for the
   *  caller and claims it in a single tap. */
  claimMine?: () => Promise<{ ok: boolean; message?: string }> | void;
  /** Set the caller's own availability (for their claimed player). */
  setMyAvailability?: (state: Availability) => void;
  /** Toggle whether a player has paid for the current match's pitch. */
  setPayment?: (playerId: string, paid: boolean) => void;
  // ── v5 additions (spec §7) ──
  /** Publish a poll-first match (the New-match wizard's final step). */
  scheduleWithPoll?: (payload: {
    times: { label: string; startsAt?: string }[];
    turfs: { label: string; detail?: string }[];
    deadline: PollDeadlineKind;
  }) => Promise<{ ok: boolean; message?: string }>;
  /** Self-service (or, as manager, on behalf of `playerId`): replace the
   *  ballot for this match with `optionIds`. */
  votePoll?: (matchId: string, optionIds: string[]) => Promise<{ ok: boolean; message?: string }>;
  /** Manager: close a live poll → status `finalizing`. */
  closePoll?: (matchId: string) => Promise<{ ok: boolean; message?: string }>;
  /** Manager: pick the winning time/turf → status `draft`. */
  finalizeMatch?: (matchId: string, timeOptionId: string, turfOptionId: string) => Promise<{ ok: boolean; message?: string }>;
  /** Post a text message to the squad chat. */
  sendChat?: (body: string) => Promise<{ ok: boolean; message?: string }>;
  /** Toggle the caller's reaction on a chat message. */
  reactChat?: (messageId: string, emoji: string) => Promise<{ ok: boolean; message?: string }>;
  /** Fetch the next-older page of chat before `(before, beforeId)`; resolves
   *  the fetched messages (empty once there's no more history). */
  loadOlderChat?: (before: string, beforeId: string) => Promise<ChatMessageSeed[]>;
  /** Self-service: pull the caller's claimed player out of a scheduled/draft match. */
  dropOut?: (matchId: string, reason: string) => Promise<{ ok: boolean; message?: string }>;
  /** Self-service: undo the caller's own unresolved drop-out. */
  undoDropout?: (matchId: string) => Promise<{ ok: boolean; message?: string }>;
  /** Manager: resolve a drop-out, optionally swapping in a replacement. */
  resolveDropout?: (matchId: string, playerId: string, replacementPlayerId?: string) => Promise<{ ok: boolean; message?: string }>;
  /** Manager: toggle the WhatsApp mirror bridge. */
  setWhatsappBridge?: (on: boolean) => Promise<{ ok: boolean; message?: string }>;
  /** Owner/admin: promote/demote a member between `admin` and `viewer`. */
  setMemberRole?: (memberId: string, role: "admin" | "viewer") => Promise<{ ok: boolean; message?: string }>;
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
  /** The caller's account subject id — matches `PublicChatMessage.authorSubjectId`
   *  so a chat row from an unclaimed account still resolves `mine`. */
  mySubjectId?: string | null;
  /** playerId → paid, for the current match's pitch-fee ledger. */
  payments?: Record<string, boolean>;
  joinCode?: string;
  joinRequests?: LiveJoinRequest[];
  votingOpen?: boolean;
  /** matchId → poll payload (v5). Absent/omitted matches have no poll. */
  polls?: Record<string, MatchPollSeed>;
  /** Squad chat, oldest or newest first — order doesn't matter, `useRondo`
   *  sorts ascending itself (v5). */
  chat?: ChatMessageSeed[];
  /** matchId → drop-out payload (v5). Absent/omitted matches have none open. */
  dropouts?: Record<string, MatchDropoutSeed>;
  /** Org-wide settings (v5) — currently just the WhatsApp mirror toggle. */
  orgSettings?: { whatsappBridge: boolean };
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

  // Live-data sync. In demo mode the VM owns local state; in live mode the seed
  // is refetched roster/availability, and the VM must re-adopt it whenever it
  // changes — otherwise a successful backend write (scout a player, someone
  // sets availability) never reflects because the VM kept its first snapshot.
  // Keyed on a content signature so it only fires on real changes (the seed
  // arrays are new references every render).
  const isLiveMode = !!seed.live;
  const rosterSig = isLiveMode
    ? (seed.players ?? []).map((p) => `${p.id}:${p.ovr}:${p.isCaptain ? 1 : 0}:${JSON.stringify(p.skills)}`).join("|")
    : "";
  React.useEffect(() => {
    if (isLiveMode && seed.players) setPlayers(seed.players);
  }, [rosterSig]);
  const availSig = isLiveMode ? JSON.stringify(seed.availability ?? {}) : "";
  React.useEffect(() => {
    if (isLiveMode && seed.availability) setAvailability(seed.availability);
  }, [availSig]);
  const [seq, setSeq] = React.useState(0); // deterministic id source (no Date.now in render)
  const [paymentsLocal, setPaymentsLocal] = React.useState<Record<string, boolean>>({});
  // Chat: pages loaded via loadOlderChat, demo-mode-only optimistic sends, and
  // demo-mode-only optimistic reaction toggles (live mode expects the seed to
  // refresh via the host's own query invalidation, so no override is needed).
  const [olderChat, setOlderChat] = React.useState<ChatMessageSeed[]>([]);
  const [chatExhausted, setChatExhausted] = React.useState(false);
  const [chatAppended, setChatAppended] = React.useState<ChatMessageSeed[]>([]);
  const [chatReactionOverrides, setChatReactionOverrides] = React.useState<Record<string, Record<string, string[]>>>({});

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

  // ---- v5 slices ----

  // Polls: seed carries the near-raw MatchPollResponse shape per match; the
  // viewer-specific `mine`/`myPlayerVoted`/`waitingPlayerIds` bits are derived
  // here since they depend on `seed.myPlayerId` + the roster.
  const rosterPlayerIds = players.map((p) => p.id);
  const polls: Record<string, MatchPollVM> = {};
  for (const [matchId, seedPoll] of Object.entries(seed.polls ?? {})) {
    polls[matchId] = buildMatchPollVM(seedPoll, rosterPlayerIds, seed.myPlayerId ?? null);
  }
  const votePoll = (matchId: string, optionIds: string[]) =>
    seed.live?.votePoll?.(matchId, optionIds) ?? Promise.resolve({ ok: true });
  const closePoll = (matchId: string) => seed.live?.closePoll?.(matchId) ?? Promise.resolve({ ok: true });
  const finalizeMatch = (matchId: string, timeOptionId: string, turfOptionId: string) =>
    seed.live?.finalizeMatch?.(matchId, timeOptionId, turfOptionId) ?? Promise.resolve({ ok: true });
  const scheduleWithPoll = (payload: {
    times: { label: string; startsAt?: string }[];
    turfs: { label: string; detail?: string }[];
    deadline: PollDeadlineKind;
  }) => seed.live?.scheduleWithPoll?.(payload) ?? Promise.resolve({ ok: true });

  // Dropouts: seed carries already display-ready rows (names + suggested
  // replacement resolved in live.ts, which has the raw roster + team
  // snapshots this package's VM layer doesn't). `openDropoutAlert` picks the
  // first open one, preferring the seed's own match ordering.
  const dropouts: Record<string, MatchDropoutVM> = {};
  for (const [matchId, d] of Object.entries(seed.dropouts ?? {})) {
    dropouts[matchId] = {
      mine: d.mine ?? null,
      open: d.open.map((o) => ({
        playerId: o.playerId,
        playerName: o.playerName,
        reason: o.reason,
        suggestedReplacement: o.suggestedReplacement ?? null,
      })),
    };
  }
  const dropoutMatchOrder = [
    ...(seed.matches ?? []).map((m) => m.id),
    ...Object.keys(seed.dropouts ?? {}),
  ];
  let openDropoutAlert: OpenDropoutAlert | null = null;
  for (const matchId of dropoutMatchOrder) {
    const first = dropouts[matchId]?.open[0];
    if (first) {
      openDropoutAlert = { matchId, playerName: first.playerName, reason: first.reason };
      break;
    }
  }
  const dropOut = (matchId: string, reason: string) => seed.live?.dropOut?.(matchId, reason) ?? Promise.resolve({ ok: true });
  const undoDropout = (matchId: string) => seed.live?.undoDropout?.(matchId) ?? Promise.resolve({ ok: true });
  const resolveDropout = (matchId: string, playerId: string, replacementPlayerId?: string) =>
    seed.live?.resolveDropout?.(matchId, playerId, replacementPlayerId) ?? Promise.resolve({ ok: true });

  // Org settings.
  const settings: OrgSettingsVM = {
    whatsappBridge: seed.orgSettings?.whatsappBridge ?? false,
    setWhatsappBridge: (on: boolean) => seed.live?.setWhatsappBridge?.(on) ?? Promise.resolve({ ok: true }),
  };

  // Member role (owner/admin promoting/demoting a member).
  const promoteToManager = (memberId: string, role: "admin" | "viewer") =>
    seed.live?.setMemberRole?.(memberId, role) ?? Promise.resolve({ ok: true });

  // Chat: seed page + any older pages fetched via loadOlder + demo-mode-only
  // optimistic sends, deduped by id (later entries win), sorted oldest→newest,
  // with any demo-mode-only reaction-toggle overrides applied.
  const chatMeKey = seed.myPlayerId ?? seed.mySubjectId ?? "me";
  const chatCombined = [...(seed.chat ?? []), ...olderChat, ...chatAppended];
  const chatById = new Map<string, ChatMessageSeed>();
  for (const m of chatCombined) chatById.set(m.id, m);
  const chatRows: ChatRowVM[] = Array.from(chatById.values())
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id))
    .map((m) => {
      const reactions = chatReactionOverrides[m.id] ?? m.reactions;
      return {
        id: m.id,
        kind: m.kind,
        body: m.body,
        matchId: m.matchId,
        authorName: m.authorName,
        mine:
          (!!seed.myPlayerId && m.authorPlayerId === seed.myPlayerId) ||
          (!!seed.mySubjectId && m.authorSubjectId === seed.mySubjectId),
        reactions,
        createdAt: m.createdAt,
      };
    });
  const chatSend = (body: string) => {
    if (seed.live?.sendChat) return seed.live.sendChat(body);
    const authorPlayerId = seed.myPlayerId ?? null;
    const authorName = authorPlayerId ? (byId(authorPlayerId)?.name ?? "You") : "You";
    setChatAppended((c) => [
      ...c,
      {
        id: `local-chat-${c.length}-${seq}`,
        kind: "text",
        body,
        matchId: null,
        authorPlayerId,
        authorSubjectId: seed.mySubjectId ?? null,
        authorName,
        reactions: {},
        createdAt: new Date().toISOString(),
      },
    ]);
    setSeq((s) => s + 1);
    return Promise.resolve({ ok: true });
  };
  const chatReact = (messageId: string, emoji: string) => {
    if (seed.live?.reactChat) return seed.live.reactChat(messageId, emoji);
    setChatReactionOverrides((prev) => {
      const base = prev[messageId] ?? chatById.get(messageId)?.reactions ?? {};
      const list = base[emoji] ?? [];
      const nextList = list.includes(chatMeKey) ? list.filter((id) => id !== chatMeKey) : [...list, chatMeKey];
      return { ...prev, [messageId]: { ...base, [emoji]: nextList } };
    });
    return Promise.resolve({ ok: true });
  };
  const chatLoadOlder = async (): Promise<void> => {
    if (chatExhausted || !seed.live?.loadOlderChat || chatCombined.length === 0) return;
    const oldest = chatCombined.reduce((a, b) => (Date.parse(a.createdAt) <= Date.parse(b.createdAt) ? a : b));
    const older = await seed.live.loadOlderChat(oldest.createdAt, oldest.id);
    if (older.length === 0) setChatExhausted(true);
    else setOlderChat((o) => [...o, ...older]);
  };
  const chat = {
    rows: chatRows,
    send: chatSend,
    react: chatReact,
    hasMore: !!seed.live?.loadOlderChat && !chatExhausted,
    loadOlder: chatLoadOlder,
  };

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
    claimMine: (): Promise<{ ok: boolean; message?: string }> =>
      seed.live?.claimMine?.() ?? Promise.resolve({ ok: false }),
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
    // v5: persist the drafted sides onto the match BEING VIEWED (not the
    // legacy seed.nextMatch target), optionally flipping draft → scheduled —
    // the "Finalize schedule" step of the poll pipeline.
    saveTeamsFor: (matchId: string, opts?: { schedule?: boolean }) => {
      if (!matchId || !seed.live?.saveTeams) return;
      const toPayload = (name: string, list: typeof home): TeamPayload => ({
        name,
        players: list.map((p) => ({ id: p.id, name: p.name, position: p.pos, rating: p.ovr })),
      });
      if (home.length && away.length) {
        seed.live.saveTeams(
          matchId,
          toPayload("Home", home),
          toPayload("Away", away),
          opts?.schedule ? { status: "scheduled" } : {},
        );
      }
    },
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
    addPlayer: (input: { name: string; position: string; email?: string | null; phone?: string | null }) =>
      seed.live?.addPlayer?.(input) ?? Promise.resolve({ ok: true as const }),
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
    // v5 slices
    polls,
    votePoll,
    closePoll,
    finalizeMatch,
    scheduleWithPoll,
    dropouts,
    openDropoutAlert,
    dropOut,
    undoDropout,
    resolveDropout,
    settings,
    promoteToManager,
    chat,
  };
}

export type RondoVM = ReturnType<typeof useRondo>;
export { AVAIL_META };
