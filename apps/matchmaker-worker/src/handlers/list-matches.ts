import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { errorResponse, validationError, pagedResponse } from "../http.js";
import { toPublicMatch } from "../mappers.js";
import { parsePageParams, encodeCursor } from "../pagination.js";

export interface HandleListMatchesDeps {
  repo?: MatchmakerRepository;
}

export async function handleListMatches(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleListMatchesDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const url = new URL(request.url);
  const pageResult = parsePageParams(url);
  if (!pageResult.ok) {
    return validationError(requestId, { [pageResult.field]: [pageResult.reason] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.read");
  if (denied) return denied;

  const { limit, cursor } = pageResult.value;
  const dbCursor = cursor ? { scheduledAt: cursor.t, id: cursor.id } : null;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.listMatchesPaged(orgId, { limit, cursor: dbCursor });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    const matches = result.value.items.map(toPublicMatch);
    const nextCursor = result.value.nextCursor
      ? encodeCursor(result.value.nextCursor.scheduledAt, result.value.nextCursor.id)
      : null;
    return pagedResponse({ matches }, requestId, nextCursor);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
