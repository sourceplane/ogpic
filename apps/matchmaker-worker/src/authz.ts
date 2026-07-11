import type { Env } from "./env.js";
import type { ActorContext } from "./router.js";
import type { PolicyResource } from "@saas/contracts/policy";
import type { Uuid } from "@saas/db/ids";
import { fetchAuthorizationContext } from "./membership-client.js";
import { authorizeViaPolicy } from "./policy-client.js";
import { errorResponse } from "./http.js";

/**
 * The standard three-step tenancy gate shared by every handler: resolve the
 * actor's membership context, then ask policy-worker whether `action` is
 * allowed on the org-scoped resource. Returns `null` on allow, or the
 * appropriate error `Response` on deny.
 *
 * Convention: both a membership miss and a policy denial surface as `404`
 * (deny-as-not-found / existence-hiding), matching the rest of the platform.
 */
export async function requireOrgAction(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  action: string,
): Promise<Response | null> {
  if (!env.MEMBERSHIP_WORKER || !env.POLICY_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const contextResult = await fetchAuthorizationContext(
    env.MEMBERSHIP_WORKER,
    actor.subjectId,
    actor.subjectType,
    orgId,
    requestId,
  );
  if (!contextResult.ok) {
    return errorResponse("not_found", "Not found", 404, requestId);
  }

  const resource: PolicyResource = { kind: "organization", orgId };
  const policyResult = await authorizeViaPolicy(
    env.POLICY_WORKER,
    actor.subjectId,
    actor.subjectType,
    action,
    resource,
    contextResult.memberships,
    requestId,
  );
  if (!policyResult.allow) {
    return errorResponse("not_found", "Not found", 404, requestId);
  }

  return null;
}
