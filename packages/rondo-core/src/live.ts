/*
 * Live-data adapter (RX2). Maps the real matchmaker API shapes (PublicPlayer,
 * the org) into the Rondo view-model's `RondoSeed`, so the same screens run on
 * the org's real roster instead of the demo seed. Voting / availability / live
 * scoring / community remain local state until their backend slices land.
 */
import type { PublicAvailability, PublicMatch, PublicPlayer } from "@saas/contracts/matchmaker";
import type { MatchPollResponse, PublicChatMessage, PublicJoinRequest, PublicMatchDropout } from "@saas/sdk";
import {
  MATCH_PHASE_LABEL,
  MATCH_PHASE_PROGRESS,
  suggestReplacement,
  type Availability,
  type MatchPhase,
  type Player,
  type Position,
  type TeamMeta,
} from "./logic";
import type {
  ChatMessageSeed,
  LiveJoinRequest,
  LiveMatchRow,
  MatchDropoutSeed,
  MatchPollSeed,
  NextMatch,
  RondoSeed,
} from "./use-rondo";

/** The v5 match lifecycle statuses this package knows about (mirrors
 *  `@saas/sdk`'s widened `MatchStatus`, see `matchmaker.ts` there). Any other
 *  string falls back to `"scheduled"` — the safest default for an
 *  unrecognized-but-presumably-real fixture. */
const KNOWN_PHASES: readonly MatchPhase[] = ["poll", "finalizing", "draft", "scheduled", "live", "played", "cancelled"];

/** Backend `MatchStatus` → the VM's `MatchPhase` (spec §3/§7). Identity today
 *  (the literal unions match); kept as an explicit named mapping so the two
 *  can diverge later without touching every call site. */
export function matchPhaseOf(status: string): MatchPhase {
  return (KNOWN_PHASES as readonly string[]).includes(status) ? (status as MatchPhase) : "scheduled";
}

/** Pending join requests → member-list rows (subject id is all we have as a label). */
export function joinRequestRows(requests: PublicJoinRequest[]): LiveJoinRequest[] {
  return requests
    .filter((r) => r.status === "pending")
    .map((r) => ({ id: r.id, name: `Player ${r.subjectId.replace(/^usr_/, "").slice(0, 6)}`, via: "REQUEST · JOIN CODE" }));
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** API availability rows → the view-model's playerId→state map. */
export function availabilityMap(rows: PublicAvailability[]): Record<string, Availability> {
  const m: Record<string, Availability> = {};
  for (const r of rows) m[r.playerId] = r.state;
  return m;
}

/** playerId → when they last set availability (ISO), for waitlist ordering. */
export function availabilityAtMap(rows: PublicAvailability[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const r of rows) m[r.playerId] = r.updatedAt;
  return m;
}

/** API matches → recent-results rows (most recent first), win/draw/loss
 *  coloured, and (v5) phase-aware for the Matches screen's cards. */
export function matchRows(matches: PublicMatch[]): LiveMatchRow[] {
  return matches.slice(0, 8).map((m) => {
    const phase = matchPhaseOf(m.status);
    const played = phase === "played" && m.scoreA != null && m.scoreB != null;
    const color = played
      ? m.scoreA! > m.scoreB!
        ? "#56C98D"
        : m.scoreA! < m.scoreB!
          ? "#FF7A6B"
          : "#C9CBCE"
      : "#8A8D93";
    const score = played ? `${m.scoreA} – ${m.scoreB}` : phase === "live" ? "LIVE" : phase === "cancelled" ? "CXL" : "—";
    const dateLabel = formatDate(m.scheduledAt);
    const venueName = m.venue?.name ?? null;
    return {
      id: m.id,
      dateLabel,
      score,
      color,
      status: m.status,
      venue: venueName,
      mapsUrl: m.venue?.mapsUrl ?? null,
      teamA: { name: m.teamA.name || "Home", players: m.teamA.players.map((p) => p.name), rating: Math.round(Number(m.ratingA)) },
      teamB: { name: m.teamB.name || "Away", players: m.teamB.players.map((p) => p.name), rating: Math.round(Number(m.ratingB)) },
      phase,
      progressStep: MATCH_PHASE_PROGRESS[phase],
      label: dateLabel ? `${dateLabel} · ${formatTime(m.scheduledAt)}` : MATCH_PHASE_LABEL[phase],
      subLabel: venueName ?? MATCH_PHASE_LABEL[phase],
    };
  });
}

/** The next actionable fixture: a live match if any, else the soonest scheduled
 *  one. Drives the manager's start / save-teams affordances. A poll/finalizing/
 *  draft match is never "actionable" here — it isn't a confirmed fixture yet
 *  (spec §7). */
export function nextActionableMatch(matches: PublicMatch[]): NextMatch | null {
  const live = matches.find((m) => matchPhaseOf(m.status) === "live");
  const scheduled = matches
    .filter((m) => matchPhaseOf(m.status) === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const m = live ?? scheduled;
  if (!m) return null;
  return {
    id: m.id,
    status: m.status,
    dateLabel: formatDate(m.scheduledAt),
    scheduledAt: m.scheduledAt,
    venue: m.venue?.name ?? null,
    mapsUrl: m.venue?.mapsUrl ?? null,
  };
}

/** Per-player record derived from played fixtures' lineup snapshots.
 *  `goals`/`motm` are v5 additions (spec §8) — always real zeros, since
 *  per-player attribution isn't tracked server-side yet. */
export interface RawPlayerStats {
  apps: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  motm: number;
}

/**
 * Appearances + W/D/L per player, from the immutable team snapshots on played
 * matches (only fully-confirmed `played` fixtures count — poll/finalizing/
 * draft/scheduled/live/cancelled never contribute). A player "appears" if
 * their id is in either lineup; the result comes from comparing their side's
 * score. Goals/MOTM aren't tracked server-side, so they're real zeros rather
 * than fabricated.
 */
export function computePlayerStats(matches: PublicMatch[]): Record<string, RawPlayerStats> {
  const out: Record<string, RawPlayerStats> = {};
  const bump = (id: string, k: "apps" | "wins" | "draws" | "losses") => {
    (out[id] ??= { apps: 0, wins: 0, draws: 0, losses: 0, goals: 0, motm: 0 })[k]++;
  };
  for (const m of matches) {
    if (matchPhaseOf(m.status) !== "played" || m.scoreA == null || m.scoreB == null) continue;
    const aWon = m.scoreA > m.scoreB;
    const draw = m.scoreA === m.scoreB;
    for (const p of m.teamA.players) {
      bump(p.id, "apps");
      bump(p.id, draw ? "draws" : aWon ? "wins" : "losses");
    }
    for (const p of m.teamB.players) {
      bump(p.id, "apps");
      bump(p.id, draw ? "draws" : aWon ? "losses" : "wins");
    }
  }
  return out;
}

/** SDK `MatchPollResponse` (per match) → the seed's near-raw poll shape. */
export function pollsSeedMap(polls: Record<string, MatchPollResponse>): Record<string, MatchPollSeed> {
  const out: Record<string, MatchPollSeed> = {};
  for (const [matchId, resp] of Object.entries(polls)) {
    out[matchId] = {
      deadlineKind: resp.poll.deadlineKind,
      deadlineAt: resp.poll.deadlineAt,
      closedAt: resp.poll.closedAt,
      options: resp.options.map((o) => ({
        id: o.id,
        kind: o.kind,
        label: o.label,
        detail: o.detail,
        startsAt: o.startsAt,
        votes: o.votes,
        voterPlayerIds: o.voterPlayerIds,
      })),
      voters: resp.voters,
      eligible: resp.eligible,
    };
  }
  return out;
}

/** SDK `PublicChatMessage[]` → the seed's chat rows (any order — `useRondo`
 *  sorts oldest→newest itself). */
export function chatSeedRows(messages: PublicChatMessage[]): ChatMessageSeed[] {
  return messages.map((m) => ({
    id: m.id,
    kind: m.kind,
    body: m.body,
    matchId: m.matchId,
    authorPlayerId: m.authorPlayerId,
    authorSubjectId: m.authorSubjectId,
    authorName: m.authorName,
    reactions: m.reactions,
    createdAt: m.createdAt,
  }));
}

/**
 * SDK `PublicMatchDropout[]` → the seed's per-match drop-out shape, grouped
 * by match, resolved ones dropped, and each entry resolved to a display-ready
 * row: the player's name and (spec: "Replace with X (ovr)") the highest-OVR
 * available player not already in either team. Needs the raw matches (for
 * team composition) and the roster (for names + the suggestion pool) — data
 * only this module has, which is why the suggestion is computed here rather
 * than in the VM layer.
 */
export function buildDropoutSeed(args: {
  matches: PublicMatch[];
  dropouts: PublicMatchDropout[];
  players: PublicPlayer[];
  myPlayerId?: string | null;
  availability?: Record<string, Availability>;
}): Record<string, MatchDropoutSeed> {
  const matchById = new Map(args.matches.map((m) => [m.id, m]));
  const nameById = new Map(args.players.map((p) => [p.id, p.name]));
  const grouped = new Map<string, PublicMatchDropout[]>();
  for (const d of args.dropouts) {
    if (d.resolvedAt) continue; // resolved drop-outs don't drive the alert/list
    const list = grouped.get(d.matchId) ?? [];
    list.push(d);
    grouped.set(d.matchId, list);
  }
  const pool = (args.availability
    ? args.players.filter((p) => (args.availability![p.id] ?? "in") === "in")
    : args.players
  ).map(mapPlayer);

  const out: Record<string, MatchDropoutSeed> = {};
  for (const [matchId, rows] of grouped) {
    const match = matchById.get(matchId);
    const inTeam = new Set<string>();
    if (match) {
      for (const p of match.teamA.players) inTeam.add(p.id);
      for (const p of match.teamB.players) inTeam.add(p.id);
    }
    const suggestion = suggestReplacement(pool, [...inTeam]);
    let mine: { reason: string } | null = null;
    const open = rows.map((d) => {
      if (args.myPlayerId && d.playerId === args.myPlayerId) mine = { reason: d.reason };
      return {
        playerId: d.playerId,
        playerName: nameById.get(d.playerId) ?? "Player",
        reason: d.reason,
        ...(suggestion ? { suggestedReplacement: { id: suggestion.id, name: suggestion.name, ovr: suggestion.ovr } } : {}),
      };
    });
    out[matchId] = { mine, open };
  }
  return out;
}

export function mapPlayer(p: PublicPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    pos: p.position as Position,
    ovr: p.rating,
    skills: { ...p.attributes },
    myStars: {},
    isCaptain: p.isCaptain,
    email: p.email ?? null,
  };
}

/**
 * Build a live seed from the org + its roster. The org *is* the squad; the
 * caller's RBAC role decides manager vs player affordances.
 */
export function buildLiveSeed(args: {
  orgName: string;
  players: PublicPlayer[];
  isManager: boolean;
  availability?: Record<string, Availability>;
  availabilityAt?: Record<string, string>;
  matches?: LiveMatchRow[];
  nextMatch?: NextMatch | null;
  playerStats?: Record<string, RawPlayerStats>;
  myPlayerId?: string | null;
  /** The caller's account subject id (v5 chat `mine` fallback for unclaimed accounts). */
  mySubjectId?: string | null;
  payments?: Record<string, boolean>;
  joinCode?: string;
  joinRequests?: LiveJoinRequest[];
  votingOpen?: boolean;
  /** v5: raw squad chat (any order). */
  chat?: PublicChatMessage[];
  /** v5: per-match poll responses, keyed by match id. */
  polls?: Record<string, MatchPollResponse>;
  /** v5: raw drop-outs across matches — resolved server-side to per-match rows
   *  (needs `dropoutMatches` for team composition to compute the suggestion). */
  dropouts?: PublicMatchDropout[];
  /** v5: the raw fixtures backing `dropouts`' suggested-replacement lookup.
   *  Distinct from `matches` (already-mapped `LiveMatchRow[]`) since that
   *  shape drops player ids. */
  dropoutMatches?: PublicMatch[];
  /** v5: org-wide settings (the WhatsApp mirror toggle). */
  orgSettings?: { whatsappBridge: boolean };
  live?: RondoSeed["live"];
}): RondoSeed {
  const team: TeamMeta = {
    id: "org",
    name: args.orgName,
    crest: (args.orgName.trim()[0] ?? "R").toUpperCase(),
    role: args.isManager ? "Manager" : "Player",
    members: args.players.length,
    league: "Your squad",
    pts: 0,
    rank: 0,
    streak: 0,
    accentCol: "#56C98D",
  };
  return {
    players: args.players.map(mapPlayer),
    teams: [team],
    teamName: args.orgName,
    startScreen: "squad",
    ...(args.availability ? { availability: args.availability } : {}),
    ...(args.availabilityAt ? { availabilityAt: args.availabilityAt } : {}),
    ...(args.matches ? { matches: args.matches } : {}),
    ...(args.nextMatch ? { nextMatch: args.nextMatch } : {}),
    ...(args.playerStats ? { playerStats: args.playerStats } : {}),
    ...(args.myPlayerId ? { myPlayerId: args.myPlayerId } : {}),
    ...(args.mySubjectId ? { mySubjectId: args.mySubjectId } : {}),
    ...(args.payments ? { payments: args.payments } : {}),
    ...(args.joinCode ? { joinCode: args.joinCode } : {}),
    ...(args.joinRequests ? { joinRequests: args.joinRequests } : {}),
    ...(args.votingOpen !== undefined ? { votingOpen: args.votingOpen } : {}),
    ...(args.chat ? { chat: chatSeedRows(args.chat) } : {}),
    ...(args.polls ? { polls: pollsSeedMap(args.polls) } : {}),
    ...(args.dropouts
      ? {
          dropouts: buildDropoutSeed({
            matches: args.dropoutMatches ?? [],
            dropouts: args.dropouts,
            players: args.players,
            ...(args.myPlayerId !== undefined ? { myPlayerId: args.myPlayerId } : {}),
            ...(args.availability ? { availability: args.availability } : {}),
          }),
        }
      : {}),
    ...(args.orgSettings ? { orgSettings: args.orgSettings } : {}),
    ...(args.live ? { live: args.live } : {}),
  };
}
