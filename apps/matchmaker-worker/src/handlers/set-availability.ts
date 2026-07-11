import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, AvailabilityState } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicAvailability } from "../mappers.js";

export interface HandleSetAvailabilityDeps {
  repo?: MatchmakerRepository;
}

const STATES: AvailabilityState[] = ["in", "maybe", "out"];

function validateBody(body: unknown): { valid: true; state: AvailabilityState } | { valid: false; fields: Record<string, string[]> } {
  if (typeof body !== "object" || body === null) {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const state = (body as { state?: unknown }).state;
  if (typeof state !== "string" || !STATES.includes(state as AvailabilityState)) {
    return { valid: false, fields: { state: ["Must be one of: in, maybe, out"] } };
  }
  return { valid: true, state: state as AvailabilityState };
}

/** PUT /v1/organizations/:orgId/availability/:playerId */
export async function handleSetAvailability(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  playerId: Uuid,
  deps?: HandleSetAvailabilityDeps,
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
  const validated = validateBody(body);
  if (!validated.valid) return validationError(requestId, validated.fields);

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.availability.set");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.setAvailability(orgId, playerId, validated.state, new Date());
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ availability: toPublicAvailability(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
