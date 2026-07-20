import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { asUuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse } from "../http.js";
import { toPublicPlayer } from "../mappers.js";
import { computeOvr, defaultAttributes } from "../engine/index.js";

export interface ClaimPlayerDeps {
  repo?: MatchmakerRepository;
}

/** Local-part of an email, capitalized, for a freshly minted player's name. */
function playerNameFromEmail(email: string | null | undefined): string {
  const trimmed = email?.trim();
  if (!trimmed) return "New Player";
  const at = trimmed.indexOf("@");
  const local = at > 0 ? trimmed.slice(0, at) : trimmed;
  if (!local) return "New Player";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/**
 * POST /v1/organizations/:orgId/players/:playerId/claim
 * A signed-in member self-selects the roster player that is them — the manager
 * added them by name+position (no email), and approving their join established
 * the trust, so any active member may claim any active, currently-unclaimed
 * roster player. The player-picks-themselves model replaces the old
 * email-matching gate (managers rarely record a roster email, so it never
 * matched and every joiner minted a duplicate).
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
  // Any active member may claim (read-level); the player self-selects which
  // unclaimed roster row is them.
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    // getPlayerById is active-only (404 for a missing or archived player);
    // claimPlayer enforces "still unclaimed" and returns conflict otherwise.
    const target = await repo.getPlayerById(orgId, playerId);
    if (!target.ok) return errorResponse("not_found", "Player not found", 404, requestId);

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
 * POST /v1/organizations/:orgId/players/mine/claim
 * "Claim mine": one-tap, server-resolved self-service claim. A member who
 * joined the squad by code has a membership but no roster player yet, so
 * nothing is claimable via the id-based claim above. This resolves, in order:
 *   1. Already claimed? Return it (idempotent).
 *   2. An unclaimed roster player with a matching contact email? Claim it.
 *   3. Otherwise mint a fresh roster player for this member and claim it.
 */
export async function handleClaimMine(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: ClaimPlayerDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  // Any active member may claim (read-level); the email check gates identity.
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const callerEmail = actor.email?.trim().toLowerCase();

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    // (1) Idempotent: the caller already has a claimed player.
    const mine = await repo.getPlayerBySubject(orgId, actor.subjectId);
    if (mine.ok) return successResponse({ player: toPublicPlayer(mine.value) }, requestId);

    // (2) An unclaimed roster player whose contact email matches the caller.
    if (callerEmail) {
      const active = await repo.listActivePlayers(orgId);
      if (active.ok) {
        const match = active.value.find(
          (p) => p.subjectId == null && p.email?.trim().toLowerCase() === callerEmail,
        );
        if (match) {
          const claimed = await repo.claimPlayer(orgId, asUuid(match.id), actor.subjectId, new Date());
          if (claimed.ok) return successResponse({ player: toPublicPlayer(claimed.value) }, requestId);
        }
      }
    }

    // (3) No roster player to claim: mint one for this member and claim it.
    const position = "ALL" as const;
    const attributes = defaultAttributes(position);
    const created = await repo.createPlayer({
      id: crypto.randomUUID(),
      orgId,
      name: playerNameFromEmail(actor.email),
      position,
      rating: computeOvr(attributes),
      attributes,
      email: actor.email ?? null,
      phone: null,
      createdAt: new Date(),
    });
    if (!created.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    const claimedNew = await repo.claimPlayer(orgId, asUuid(created.value.id), actor.subjectId, new Date());
    if (!claimedNew.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ player: toPublicPlayer(claimedNew.value) }, requestId, 201);
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
