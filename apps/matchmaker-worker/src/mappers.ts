import type { PublicAvailability, PublicMatch, PublicPlayer } from "@saas/contracts/matchmaker";
import type { Availability, Match, Player } from "@saas/db/matchmaker";
import { matchPublicId, orgPublicId, playerPublicId } from "./ids.js";
import { effectiveRating } from "./engine/index.js";

/** Community vote aggregate for a player; absent/zero → baseline only. */
export interface VoteAggregate {
  voterCount: number;
  avgStars: number;
}

export function toPublicPlayer(player: Player, votes?: VoteAggregate | null): PublicPlayer {
  const baseRating = player.rating;
  const voteCount = votes?.voterCount ?? 0;
  const rating = effectiveRating(baseRating, voteCount, votes?.avgStars ?? 0);
  return {
    id: playerPublicId(player.id),
    orgId: orgPublicId(player.orgId),
    name: player.name,
    position: player.position,
    rating,
    baseRating,
    voteCount,
    attributes: player.attributes,
    status: player.status,
    isCaptain: player.isCaptain,
    createdAt: player.createdAt.toISOString(),
    updatedAt: player.updatedAt.toISOString(),
    archivedAt: player.archivedAt ? player.archivedAt.toISOString() : null,
  };
}

export function toPublicMatch(match: Match): PublicMatch {
  return {
    id: matchPublicId(match.id),
    orgId: orgPublicId(match.orgId),
    scheduledAt: match.scheduledAt.toISOString(),
    status: match.status,
    format: match.format,
    teamA: match.teamA,
    teamB: match.teamB,
    ratingA: Number(match.ratingA),
    ratingB: Number(match.ratingB),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    venue: match.venue,
    shareToken: match.shareToken,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
  };
}

export function toPublicAvailability(a: Availability): PublicAvailability {
  return {
    playerId: playerPublicId(a.playerId),
    state: a.state,
    updatedAt: a.updatedAt.toISOString(),
  };
}
