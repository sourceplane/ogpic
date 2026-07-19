import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import type { EventsRepository } from "@saas/db/events";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createEventsRepository } from "@saas/db/events";
import { authorizeViaPolicy } from "../policy-client.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { parseOrgPublicId, parseMemberPublicId, memberPublicId } from "../ids.js";

const SETTABLE_ROLES = ["admin", "viewer"] as const;
type SettableRole = (typeof SETTABLE_ROLES)[number];

function isSettableRole(value: unknown): value is SettableRole {
  return typeof value === "string" && (SETTABLE_ROLES as readonly string[]).includes(value);
}

export interface SetMemberRoleDeps {
  repo: Pick<MembershipRepository, "listRoleAssignments" | "getMemberById" | "setMemberRole">;
  eventsRepo?: Pick<EventsRepository, "appendEventWithAudit">;
  now?: () => Date;
  generateId?: () => string;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) {
    hex += buf[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * PUT /v1/organizations/{orgId}/members/{memberId}/role — promote/demote a
 * member between `admin` and `viewer` (owner/admin only; see
 * `organization.member_role.set` in policy-engine). Distinct from the
 * generic `PATCH .../members/{memberId}` (`handleUpdateMemberRole`): this
 * endpoint never targets or grants `owner`, and setting the owner's role is a
 * hard conflict rather than a last-owner count check.
 */
export async function handleSetMemberRole(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgIdParam: string,
  memberIdParam: string,
  deps?: SetMemberRoleDeps,
): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) {
    return errorResponse("not_found", "Organization not found", 404, requestId);
  }

  const memberUuid = parseMemberPublicId(memberIdParam);
  if (!memberUuid) {
    return errorResponse("not_found", "Member not found", 404, requestId);
  }

  if (!deps && !env.PLATFORM_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  if (!env.POLICY_WORKER) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  if (!body || typeof body !== "object" || !("role" in body)) {
    return validationError(requestId, { role: ["Role is required"] });
  }

  const role = (body as { role: unknown }).role;
  if (!isSettableRole(role)) {
    return validationError(requestId, { role: ["Must be 'admin' or 'viewer'"] });
  }

  const policyWorker = env.POLICY_WORKER;
  const executor = deps ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps ? deps.repo : createMembershipRepository(executor!);

    const rolesResult = await repo.listRoleAssignments(orgUuid, actor.subjectId);
    if (!rolesResult.ok) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const authResult = await authorizeViaPolicy(policyWorker, {
      actor,
      action: "organization.member_role.set",
      resource: { kind: "member", id: memberUuid, orgId: orgUuid },
      orgId: orgUuid,
      roleAssignments: rolesResult.value,
      requestId,
    });

    if (!authResult.allow) {
      return errorResponse("not_found", "Organization not found", 404, requestId);
    }

    const now = deps?.now ? deps.now() : new Date();
    const genId = deps?.generateId ?? (() => randomHex(16));

    if (executor && "transaction" in executor) {
      const result = await executor.transaction(async (txExec) => {
        const txRepo = createMembershipRepository(txExec);
        const txEventsRepo = createEventsRepository(txExec);

        const memberResult = await txRepo.getMemberById(orgUuid, memberUuid);
        if (!memberResult.ok) {
          return { error: memberResult.error.kind === "removed" ? "removed" as const : "not_found" as const };
        }

        const member = memberResult.value;
        const targetRoles = await txRepo.listRoleAssignments(orgUuid, member.subjectId);
        if (!targetRoles.ok) {
          return { error: "internal" as const };
        }

        const orgRoles = targetRoles.value.filter((r) => r.scopeKind === "organization");
        if (orgRoles.some((r) => r.role === "owner")) {
          return { error: "owner" as const };
        }

        if (orgRoles.length === 1 && orgRoles[0]!.role === role) {
          return { noop: true as const, member, role };
        }

        const previousRole = orgRoles[0]?.role ?? null;
        const assignment = await txRepo.setMemberRole(orgUuid, member.subjectId, member.subjectType, role, crypto.randomUUID(), now);
        if (!assignment.ok) {
          throw new Error("role_assignment_failed");
        }

        const eventResult = await txEventsRepo.appendEventWithAudit({
          event: {
            id: genId(),
            type: "membership.role_changed",
            version: 1,
            source: "membership-worker",
            occurredAt: now,
            actorType: actor.subjectType,
            actorId: actor.subjectId,
            orgId: orgUuid,
            subjectKind: "member",
            subjectId: memberUuid,
            requestId,
            payload: { memberId: memberPublicId(memberUuid), previousRole, role },
          },
          audit: {
            id: genId(),
            category: "membership",
            description: `Member ${memberPublicId(memberUuid)} role changed to ${role}`,
          },
        });

        if (!eventResult.ok) {
          throw new Error("event_append_failed");
        }

        return { member, role };
      });

      if ("error" in result) {
        if (result.error === "not_found" || result.error === "removed") {
          return errorResponse("not_found", "Member not found", 404, requestId);
        }
        if (result.error === "owner") {
          return errorResponse("conflict", "Cannot change the owner's role", 409, requestId);
        }
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }

      return successResponse({ membership: { memberId: memberPublicId(result.member!.id), role: result.role! } }, requestId, 200);
    }

    // Non-transactional path (unit tests with injected deps)
    const memberResult = await repo.getMemberById(orgUuid, memberUuid);
    if (!memberResult.ok) {
      return errorResponse("not_found", "Member not found", 404, requestId);
    }

    const member = memberResult.value;
    const targetRoles = await repo.listRoleAssignments(orgUuid, member.subjectId);
    if (!targetRoles.ok) {
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    const orgRoles = targetRoles.value.filter((r) => r.scopeKind === "organization");
    if (orgRoles.some((r) => r.role === "owner")) {
      return errorResponse("conflict", "Cannot change the owner's role", 409, requestId);
    }

    if (orgRoles.length === 1 && orgRoles[0]!.role === role) {
      return successResponse({ membership: { memberId: memberPublicId(member.id), role } }, requestId, 200);
    }

    const previousRole = orgRoles[0]?.role ?? null;
    const assignment = await repo.setMemberRole(orgUuid, member.subjectId, member.subjectType, role, crypto.randomUUID(), now);
    if (!assignment.ok) {
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    if (deps?.eventsRepo) {
      const eventResult = await deps.eventsRepo.appendEventWithAudit({
        event: {
          id: genId(),
          type: "membership.role_changed",
          version: 1,
          source: "membership-worker",
          occurredAt: now,
          actorType: actor.subjectType,
          actorId: actor.subjectId,
          orgId: orgUuid,
          subjectKind: "member",
          subjectId: memberUuid,
          requestId,
          payload: { memberId: memberPublicId(memberUuid), previousRole, role },
        },
        audit: {
          id: genId(),
          category: "membership",
          description: `Member ${memberPublicId(memberUuid)} role changed to ${role}`,
        },
      });

      if (!eventResult.ok) {
        return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
      }
    }

    return successResponse({ membership: { memberId: memberPublicId(member.id), role } }, requestId, 200);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
