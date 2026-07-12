import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import type { Uuid } from "@saas/db/ids";
import { authorizeViaPolicy } from "../policy-client.js";
import { errorResponse } from "../http.js";

/**
 * Manager gate shared by the join-code / join-request handlers: load the
 * actor's role assignments in the org, then ask policy-worker whether `action`
 * is allowed. Deny (missing membership or policy no) → opaque 404, matching the
 * rest of the membership worker. Returns null on allow.
 */
export async function requireManager(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgUuid: Uuid,
  action: string,
  repo: Pick<MembershipRepository, "listRoleAssignments">,
): Promise<Response | null> {
  if (!env.POLICY_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const rolesResult = await repo.listRoleAssignments(orgUuid, actor.subjectId);
  if (!rolesResult.ok) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }
  const authResult = await authorizeViaPolicy(env.POLICY_WORKER, {
    actor,
    action,
    resource: { kind: "organization", id: orgUuid, orgId: orgUuid },
    orgId: orgUuid,
    roleAssignments: rolesResult.value,
    requestId,
  });
  if (!authResult.allow) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }
  return null;
}
