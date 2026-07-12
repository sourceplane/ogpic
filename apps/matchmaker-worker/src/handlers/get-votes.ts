import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse } from "../http.js";

export interface HandleGetVotesDeps {
  repo?: MatchmakerRepository;
}

/** GET /v1/organizations/:orgId/players/:playerId/votes — caller's votes + stats. */
export async function handleGetVotes(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  playerId: Uuid,
  deps?: HandleGetVotesDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const existing = await repo.getPlayerById(orgId, playerId);
    if (!existing.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }

    const myVotesResult = await repo.getVoterVotes(orgId, playerId, actor.subjectId);
    const myVotes: Record<string, number> = {};
    if (myVotesResult.ok) {
      for (const v of myVotesResult.value) myVotes[v.skill] = v.stars;
    }

    const statsResult = await repo.getPlayerVoteStats(orgId, playerId);
    const stats = statsResult.ok
      ? { voterCount: statsResult.value.voterCount, avgStars: statsResult.value.avgStars }
      : { voterCount: 0, avgStars: 0 };

    return successResponse({ myVotes, stats }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
