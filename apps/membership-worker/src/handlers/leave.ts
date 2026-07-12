import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MembershipRepository } from "@saas/db/membership";
import type { EventsRepository } from "@saas/db/events";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createEventsRepository } from "@saas/db/events";
import { successResponse, errorResponse } from "../http.js";
import { parseOrgPublicId, memberPublicId } from "../ids.js";

export interface LeaveOrgDeps {
  repo: Pick<
    MembershipRepository,
    "getMemberBySubjectId" | "listRoleAssignments" | "removeMember" | "countActiveOwners" | "revokeAllRoleAssignments"
  >;
  eventsRepo?: Pick<EventsRepository, "appendEventWithAudit">;
  now?: () => Date;
  generateId?: () => string;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) hex += buf[i]!.toString(16).padStart(2, "0");
  return hex;
}

/**
 * POST /v1/organizations/:orgId/leave — the caller removes their OWN membership.
 * No policy grant is required (any member may leave themselves), but the last
 * active owner cannot leave (they must transfer ownership first), mirroring the
 * admin `removeMember` guard.
 */
export async function handleLeaveOrganization(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgIdParam: string,
  deps?: LeaveOrgDeps,
): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) return errorResponse("not_found", "Organization not found", 404, requestId);
  if (!deps && !env.PLATFORM_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const executor = deps ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps ? deps.repo : createMembershipRepository(executor!);
    const now = deps?.now ? deps.now() : new Date();
    const genId = deps?.generateId ?? (() => randomHex(16));

    const run = async (
      r: LeaveOrgDeps["repo"],
      eventsRepo: Pick<EventsRepository, "appendEventWithAudit"> | undefined,
    ) => {
      const memberResult = await r.getMemberBySubjectId(orgUuid, actor.subjectId);
      if (!memberResult.ok) return { error: "not_member" as const };
      const member = memberResult.value;

      const roles = await r.listRoleAssignments(orgUuid, actor.subjectId);
      if (!roles.ok) return { error: "internal" as const };

      const isOwner = roles.value.some((x) => x.scopeKind === "organization" && x.role === "owner");
      if (isOwner) {
        const ownerCount = await r.countActiveOwners(orgUuid);
        if (!ownerCount.ok) return { error: "internal" as const };
        if (ownerCount.value <= 1) return { error: "last_owner" as const };
      }

      const removeResult = await r.removeMember(orgUuid, member.id, now);
      if (!removeResult.ok) return { error: "not_member" as const };

      const revoked = await r.revokeAllRoleAssignments(orgUuid, actor.subjectId, now);
      if (!revoked.ok) throw new Error("role_revocation_failed");
      const previousRoles = roles.value.filter((x) => x.scopeKind === "organization").map((x) => x.role);

      if (eventsRepo) {
        const eventResult = await eventsRepo.appendEventWithAudit({
          event: {
            id: genId(),
            type: "membership.left",
            version: 1,
            source: "membership-worker",
            occurredAt: now,
            actorType: actor.subjectType,
            actorId: actor.subjectId,
            orgId: orgUuid,
            subjectKind: "member",
            subjectId: member.id,
            requestId,
            payload: { memberId: memberPublicId(member.id), previousRoles, revokedRoleCount: revoked.value.length },
          },
          audit: {
            id: genId(),
            category: "membership",
            description: `Member ${memberPublicId(member.id)} left the organization`,
          },
        });
        if (!eventResult.ok) throw new Error("event_append_failed");
      }

      return { member: removeResult.value };
    };

    const result =
      executor && "transaction" in executor
        ? await executor.transaction(async (txExec) =>
            run(createMembershipRepository(txExec), createEventsRepository(txExec)),
          )
        : await run(repo, deps?.eventsRepo);

    if ("error" in result) {
      if (result.error === "not_member") return errorResponse("not_found", "You are not a member of this organization", 404, requestId);
      if (result.error === "last_owner") return errorResponse("precondition_failed", "Transfer ownership before leaving — you are the last active owner", 422, requestId);
      return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
    }

    return successResponse(
      {
        member: {
          id: memberPublicId(result.member.id),
          subjectType: result.member.subjectType,
          subjectId: result.member.subjectId,
          status: "removed",
          joinedAt: result.member.createdAt.toISOString(),
          roles: [],
        },
      },
      requestId,
      200,
    );
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
