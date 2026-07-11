import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { Uuid } from "@saas/db/ids";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { suggestPosition, validateAttributes } from "../engine/index.js";

/**
 * Pure best-fit position suggestion from a set of OUTFIELD attributes. No
 * persistence; requires only roster.read. Mirrors the seed app's client-side
 * "Auto-Suggest Position" wand.
 */
export async function handleSuggestPosition(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  const attrs = (body as { attributes?: unknown } | null)?.attributes;
  // Suggestion is only defined for outfield attribute sets.
  const check = validateAttributes("MID", attrs);
  if (!check.valid) {
    return validationError(requestId, { attributes: [check.reason] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  try {
    return successResponse({ position: suggestPosition(check.attributes) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
}
