import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, Player, PlayerVote } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicPlayer } from "../mappers.js";
import { expectedKeysForPosition } from "../engine/index.js";

const STARS_MIN = 1;
const STARS_MAX = 5;

/** Validate the `votes` map against the player's position attribute keys. */
export function validateVotes(
  player: Pick<Player, "position">,
  body: unknown,
): { valid: true; value: PlayerVote[] } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const raw = (body as Record<string, unknown>).votes;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, fields: { votes: ["Must be an object of skill → stars"] } };
  }
  const expected = expectedKeysForPosition(player.position);
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    return { valid: false, fields: { votes: ["At least one skill vote is required"] } };
  }
  const votes: PlayerVote[] = [];
  for (const [skill, value] of entries) {
    if (!expected.includes(skill)) {
      return { valid: false, fields: { votes: [`Unexpected skill: ${skill}`] } };
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < STARS_MIN || value > STARS_MAX) {
      return { valid: false, fields: { votes: [`${skill} stars must be an integer between ${STARS_MIN} and ${STARS_MAX}`] } };
    }
    votes.push({ skill, stars: value });
  }
  return { valid: true, value: votes };
}

function votesToMap(votes: PlayerVote[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const v of votes) m[v.skill] = v.stars;
  return m;
}

export interface HandleCastVotesDeps {
  repo?: MatchmakerRepository;
}

/** POST /v1/organizations/:orgId/players/:playerId/votes — rate a teammate. */
export async function handleCastVotes(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  playerId: Uuid,
  deps?: HandleCastVotesDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.player.vote");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    // Voting is only allowed while the manager has a rating round open.
    const round = await repo.getOpenRatingRound(orgId);
    if (!round.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    if (round.value === null) {
      return errorResponse("precondition_failed", "Voting is closed — no rating round is open", 409, requestId);
    }

    const existing = await repo.getPlayerById(orgId, playerId);
    if (!existing.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }

    const validation = validateVotes(existing.value, body);
    if (!validation.valid) {
      return validationError(requestId, validation.fields);
    }

    const cast = await repo.castPlayerVotes({
      orgId,
      playerId,
      voterId: actor.subjectId,
      votes: validation.value,
      now: new Date(),
    });
    if (!cast.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    const statsResult = await repo.getPlayerVoteStats(orgId, playerId);
    const stats = statsResult.ok ? statsResult.value : { playerId, voterCount: 0, avgStars: 0 };
    const myVotesResult = await repo.getVoterVotes(orgId, playerId, actor.subjectId);
    const myVotes = myVotesResult.ok ? myVotesResult.value : validation.value;

    return successResponse(
      {
        player: toPublicPlayer(existing.value, stats),
        myVotes: votesToMap(myVotes),
        stats: { voterCount: stats.voterCount, avgStars: stats.avgStars },
      },
      requestId,
    );
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
