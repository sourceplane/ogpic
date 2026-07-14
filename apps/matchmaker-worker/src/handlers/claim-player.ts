import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse } from "../http.js";
import { toPublicPlayer } from "../mappers.js";

export interface ClaimPlayerDeps {
  repo?: MatchmakerRepository;
}

/**
 * POST /v1/organizations/:orgId/players/:playerId/claim
 * A signed-in member claims a roster player as themselves so they can manage
 * their own availability. Safe: the player's contact email must match the
 * caller's account email, and the player must be currently unclaimed.
 */
export async function handleClaimPlayer(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  playerId: Uuid,
  deps?: ClaimPlayerDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  // Any active member may claim (read-level); the email check gates identity.
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const callerEmail = actor.email?.trim().toLowerCase();
  if (!callerEmail) {
    return errorResponse("forbidden", "Your account has no email to match a player", 403, requestId);
  }

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const target = await repo.getPlayerById(orgId, playerId);
    if (!target.ok) return errorResponse("not_found", "Player not found", 404, requestId);

    const playerEmail = target.value.email?.trim().toLowerCase();
    if (!playerEmail || playerEmail !== callerEmail) {
      return errorResponse("forbidden", "This player is not linked to your email", 403, requestId);
    }

    const claimed = await repo.claimPlayer(orgId, playerId, actor.subjectId, new Date());
    if (!claimed.ok) {
      return errorResponse("conflict", "This player is already claimed", 409, requestId);
    }
    return successResponse({ player: toPublicPlayer(claimed.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/**
 * GET /v1/organizations/:orgId/players/mine
 * The roster player the caller has claimed in this org, or null.
 */
export async function handleGetMyPlayer(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: ClaimPlayerDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.getPlayerBySubject(orgId, actor.subjectId);
    if (!result.ok) return successResponse({ player: null }, requestId);
    return successResponse({ player: toPublicPlayer(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
