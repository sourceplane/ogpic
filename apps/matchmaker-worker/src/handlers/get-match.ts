import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse } from "../http.js";
import { toPublicMatch } from "../mappers.js";

export interface HandleGetMatchDeps {
  repo?: MatchmakerRepository;
}

export async function handleGetMatch(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: HandleGetMatchDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.getMatchById(orgId, matchId);
    if (!result.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }
    return successResponse({ match: toPublicMatch(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
