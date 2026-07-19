import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";

export interface OrgSettingsDeps {
  repo?: MatchmakerRepository;
}

/** GET /v1/organizations/:orgId/settings — matchmaker settings; any member. */
export async function handleGetOrgSettings(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: OrgSettingsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.settings.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.getOrgSettings(orgId);
    if (!result.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    // No row yet -> the bridge has never been turned on.
    return successResponse({ whatsappBridge: result.value?.whatsappBridge ?? false }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

function parseSettingsBody(
  body: unknown,
): { valid: true; whatsappBridge: boolean } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const whatsappBridge = (body as Record<string, unknown>).whatsappBridge;
  if (typeof whatsappBridge !== "boolean") {
    return { valid: false, fields: { whatsappBridge: ["Must be a boolean"] } };
  }
  return { valid: true, whatsappBridge };
}

/** PUT /v1/organizations/:orgId/settings — set matchmaker settings; manager only. */
export async function handleSetOrgSettings(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: OrgSettingsDeps,
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
  const parsed = parseSettingsBody(body);
  if (!parsed.valid) return validationError(requestId, parsed.fields);

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.settings.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.setOrgSettings(orgId, { whatsappBridge: parsed.whatsappBridge }, new Date());
    if (!result.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    return successResponse({ whatsappBridge: result.value.whatsappBridge }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
