import type { PublicMatch, PublicPlayer } from "@saas/contracts/matchmaker";
import type { Match, Player } from "@saas/db/matchmaker";
import { matchPublicId, orgPublicId, playerPublicId } from "./ids.js";

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: playerPublicId(player.id),
    orgId: orgPublicId(player.orgId),
    name: player.name,
    position: player.position,
    rating: player.rating,
    attributes: player.attributes,
    status: player.status,
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
    shareToken: match.shareToken,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
  };
}
