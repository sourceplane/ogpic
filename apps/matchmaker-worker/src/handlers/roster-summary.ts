import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import type { RosterSummaryResponse } from "@saas/contracts/matchmaker";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse } from "../http.js";

export interface HandleRosterSummaryDeps {
  repo?: MatchmakerRepository;
}

export async function handleRosterSummary(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleRosterSummaryDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.rosterSummary(orgId);
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    const byPosition = result.value;
    const totalPlayers = byPosition.reduce((acc, e) => acc + e.count, 0);
    const weighted = byPosition.reduce((acc, e) => acc + e.averageRating * e.count, 0);
    const averageRating = totalPlayers > 0 ? Math.round(weighted / totalPlayers) : 0;
    const response: RosterSummaryResponse = { totalPlayers, averageRating, byPosition };
    return successResponse(response, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
