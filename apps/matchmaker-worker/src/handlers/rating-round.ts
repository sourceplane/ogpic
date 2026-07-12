import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, RatingRound } from "@saas/db/matchmaker";
import type { PublicRatingRound } from "@saas/contracts/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { DEFAULT_ATTRIBUTE_VALUE } from "../engine/index.js";

export interface RatingRoundDeps {
  repo?: MatchmakerRepository;
}

function toPublicRound(round: RatingRound): PublicRatingRound {
  return {
    id: round.id,
    status: round.status,
    openedAt: round.openedAt.toISOString(),
    closedAt: round.closedAt ? round.closedAt.toISOString() : null,
  };
}

/** GET /rating-round — the org's open voting window (or null). Any member. */
export async function handleGetRatingRound(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: RatingRoundDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) return errorResponse("internal_error", "Service unavailable", 503, requestId);
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const round = await repo.getOpenRatingRound(orgId);
    if (!round.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    return successResponse({ round: round.value ? toPublicRound(round.value) : null }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /rating-round/open — open a voting window (manager). Optionally reset. */
export async function handleOpenRatingRound(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: RatingRoundDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  let resetScores = false;
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (body.resetScores !== undefined) {
        if (typeof body.resetScores !== "boolean") return validationError(requestId, { resetScores: ["Must be a boolean"] });
        resetScores = body.resetScores;
      }
    }
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const now = new Date();
    if (resetScores) {
      const reset = await repo.resetScoresToBaseline(orgId, DEFAULT_ATTRIBUTE_VALUE, now);
      if (!reset.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    const opened = await repo.openRatingRound(crypto.randomUUID(), orgId, actor.subjectId, now);
    if (!opened.ok) {
      if (opened.error.kind === "conflict") {
        return errorResponse("conflict", "A rating round is already open", 409, requestId);
      }
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ round: toPublicRound(opened.value) }, requestId, 201);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /rating-round/close — close the open voting window (manager). */
export async function handleCloseRatingRound(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: RatingRoundDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) return errorResponse("internal_error", "Service unavailable", 503, requestId);
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const closed = await repo.closeRatingRound(orgId, new Date());
    if (!closed.ok) {
      return errorResponse("not_found", "No rating round is open", 404, requestId);
    }
    return successResponse({ round: toPublicRound(closed.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
