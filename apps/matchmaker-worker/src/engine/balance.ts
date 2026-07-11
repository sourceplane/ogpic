// The balancing draft engine. Pure, deterministic, dependency-free — the one
// piece of real domain IP in this context, so it is isolated from all I/O and
// exhaustively unit-tested without a database.

import type { PlayerPosition } from "@saas/contracts/matchmaker";

/** Minimal player shape the balancer needs. */
export interface BalanceablePlayer {
  id: string;
  name: string;
  position: PlayerPosition;
  rating: number;
}

export interface BalancedTeam {
  name: string;
  players: BalanceablePlayer[];
  squadRating: number;
  totalRating: number;
}

export interface BalanceResult {
  teams: BalancedTeam[];
  ratingSpread: number;
}

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 8;

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD", "ALL"];

function defaultTeamName(index: number): string {
  if (index === 0) return "Home Team";
  if (index === 1) return "Away Team";
  return `Team ${index + 1}`;
}

/**
 * Split `players` into `teamCount` size-balanced, rating-balanced squads.
 *
 * Algorithm (generalized from the seed app's two-team `generateTeams`):
 *   1. Bucket players by position, then sort each bucket descending by OVR.
 *   2. Walk the buckets GK → DEF → MID → FWD → ALL so keepers and spines are
 *      spread before utility players.
 *   3. Assign each player to the team with the FEWEST players; break size ties
 *      by the LOWEST running total OVR; break remaining ties by team index.
 *
 * Deterministic: no randomness, so the same roster always drafts the same
 * teams — which is what makes "the engine decided, not a person" defensible.
 */
export function draftBalancedTeams(
  players: BalanceablePlayer[],
  teamCount = 2,
  teamNames: string[] = [],
): BalanceResult {
  const count = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, Math.floor(teamCount)));
  const buckets = new Map<PlayerPosition, BalanceablePlayer[]>();
  for (const pos of POSITION_ORDER) buckets.set(pos, []);
  for (const player of players) {
    const pos = POSITION_ORDER.includes(player.position) ? player.position : "ALL";
    buckets.get(pos)!.push(player);
  }
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => b.rating - a.rating);
  }

  const teams: BalanceablePlayer[][] = Array.from({ length: count }, () => []);
  const totals: number[] = Array.from({ length: count }, () => 0);

  const pickTeam = (): number => {
    let best = 0;
    for (let i = 1; i < count; i++) {
      const fewer = teams[i]!.length < teams[best]!.length;
      const tieSize = teams[i]!.length === teams[best]!.length;
      const lowerTotal = totals[i]! < totals[best]!;
      if (fewer || (tieSize && lowerTotal)) {
        best = i;
      }
    }
    return best;
  };

  for (const pos of POSITION_ORDER) {
    for (const player of buckets.get(pos)!) {
      const target = pickTeam();
      teams[target]!.push(player);
      totals[target]! += player.rating;
    }
  }

  const built: BalancedTeam[] = teams.map((squad, i) => {
    const totalRating = totals[i]!;
    const squadRating = squad.length > 0 ? Math.round(totalRating / squad.length) : 0;
    const name = teamNames[i]?.trim() || defaultTeamName(i);
    return { name, players: squad, squadRating, totalRating };
  });

  const ratings = built.map((t) => t.squadRating);
  const ratingSpread = ratings.length > 0 ? Math.max(...ratings) - Math.min(...ratings) : 0;

  return { teams: built, ratingSpread };
}
