/*
 * Live-data adapter (RX2). Maps the real matchmaker API shapes (PublicPlayer,
 * the org) into the Rondo view-model's `RondoSeed`, so the same screens run on
 * the org's real roster instead of the demo seed. Voting / availability / live
 * scoring / community remain local state until their backend slices land.
 */
import type { PublicAvailability, PublicMatch, PublicPlayer } from "@saas/contracts/matchmaker";
import type { PublicJoinRequest } from "@saas/sdk";
import type { Availability, Player, Position, TeamMeta } from "./logic";
import type { LiveJoinRequest, LiveMatchRow, NextMatch, RondoSeed } from "./use-rondo";

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

/** API availability rows → the view-model's playerId→state map. */
export function availabilityMap(rows: PublicAvailability[]): Record<string, Availability> {
  const m: Record<string, Availability> = {};
  for (const r of rows) m[r.playerId] = r.state;
  return m;
}

/** API matches → recent-results rows (most recent first), win/draw/loss coloured. */
export function matchRows(matches: PublicMatch[]): LiveMatchRow[] {
  return matches.slice(0, 8).map((m) => {
    const played = m.status === "played" && m.scoreA != null && m.scoreB != null;
    const color = played
      ? m.scoreA! > m.scoreB!
        ? "#56C98D"
        : m.scoreA! < m.scoreB!
          ? "#FF7A6B"
          : "#C9CBCE"
      : "#8A8D93";
    const score = played ? `${m.scoreA} – ${m.scoreB}` : m.status === "live" ? "LIVE" : m.status === "cancelled" ? "CXL" : "—";
    return { id: m.id, dateLabel: formatDate(m.scheduledAt), score, color, status: m.status, venue: m.venue?.name ?? null, mapsUrl: m.venue?.mapsUrl ?? null };
  });
}

/** The next actionable fixture: a live match if any, else the soonest scheduled
 *  one. Drives the manager's start / save-teams affordances. */
export function nextActionableMatch(matches: PublicMatch[]): NextMatch | null {
  const live = matches.find((m) => m.status === "live");
  const scheduled = matches
    .filter((m) => m.status === "scheduled")
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
  matches?: LiveMatchRow[];
  nextMatch?: NextMatch | null;
  joinCode?: string;
  joinRequests?: LiveJoinRequest[];
  votingOpen?: boolean;
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
    ...(args.matches ? { matches: args.matches } : {}),
    ...(args.nextMatch ? { nextMatch: args.nextMatch } : {}),
    ...(args.joinCode ? { joinCode: args.joinCode } : {}),
    ...(args.joinRequests ? { joinRequests: args.joinRequests } : {}),
    ...(args.votingOpen !== undefined ? { votingOpen: args.votingOpen } : {}),
    ...(args.live ? { live: args.live } : {}),
  };
}
