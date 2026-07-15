import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { playerPublicId } from "../ids.js";

export interface MatchPaymentsDeps {
  repo?: MatchmakerRepository;
}

/** GET /v1/organizations/:orgId/matches/:matchId/payments — who has paid. */
export async function handleListMatchPayments(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchPaymentsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.listMatchPayments(orgId, matchId);
    if (!result.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    const payments = result.value.map((p) => ({
      playerId: playerPublicId(p.playerId),
      paid: p.paid,
      updatedAt: p.updatedAt.toISOString(),
    }));
    return successResponse({ payments }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** PUT /v1/organizations/:orgId/matches/:matchId/payments/:playerId — set paid. */
export async function handleSetMatchPayment(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  playerId: Uuid,
  deps?: MatchPaymentsDeps,
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
  const paid = (body as { paid?: unknown })?.paid;
  if (typeof paid !== "boolean") {
    return validationError(requestId, { paid: ["Must be a boolean"] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.setMatchPayment(orgId, matchId, playerId, paid, new Date());
    if (!result.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    const p = result.value;
    return successResponse(
      { payment: { playerId: playerPublicId(p.playerId), paid: p.paid, updatedAt: p.updatedAt.toISOString() } },
      requestId,
    );
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
