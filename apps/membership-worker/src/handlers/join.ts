import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { JoinRequest, MembershipRepository } from "@saas/db/membership";
import type { Uuid } from "@saas/db/ids";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { successResponse, errorResponse, validationError } from "../http.js";
import {
  parseOrgPublicId,
  parseJoinRequestPublicId,
  joinRequestPublicId,
  generateJoinCode,
} from "../ids.js";
import { requireManager } from "./join-authz.js";

export interface JoinDeps {
  repo?: MembershipRepository;
}

function toPublicJoinRequest(jr: JoinRequest) {
  return {
    id: joinRequestPublicId(jr.id),
    subjectId: jr.subjectId,
    status: jr.status,
    requestedRole: jr.requestedRole,
    createdAt: jr.createdAt.toISOString(),
    decidedAt: jr.decidedAt ? jr.decidedAt.toISOString() : null,
  };
}

function repoFor(env: Env, deps?: JoinDeps): { repo: MembershipRepository; executor: { dispose(): Promise<void> } | null } {
  if (deps?.repo) return { repo: deps.repo, executor: null };
  const executor = createSqlExecutor(env.PLATFORM_DB!);
  return { repo: createMembershipRepository(executor), executor };
}

/** GET /v1/organizations/:orgId/join-code — read (mint if absent). Manager. */
export async function handleGetJoinCode(env: Env, requestId: string, actor: ActorContext, orgIdParam: string, deps?: JoinDeps): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) return errorResponse("not_found", "Organization not found", 404, requestId);
  if (!deps?.repo && !env.PLATFORM_DB) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  const { repo, executor } = repoFor(env, deps);
  try {
    const denied = await requireManager(env, requestId, actor, orgUuid, "organization.join_code.read", repo);
    if (denied) return denied;

    const org = await repo.getOrganizationById(orgUuid);
    if (!org.ok) return errorResponse("not_found", "Organization not found", 404, requestId);
    if (org.value.joinCode) return successResponse({ code: org.value.joinCode }, requestId);

    // Lazy-mint on first read, retrying once on the (extremely unlikely) collision.
    for (let attempt = 0; attempt < 3; attempt++) {
      const set = await repo.setOrganizationJoinCode(orgUuid, generateJoinCode(), new Date());
      if (set.ok) return successResponse({ code: set.value.joinCode }, requestId);
      if (set.error.kind !== "conflict") return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return errorResponse("internal_error", "Could not mint a join code", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /v1/organizations/:orgId/join-code/rotate — new code. Manager. */
export async function handleRotateJoinCode(env: Env, requestId: string, actor: ActorContext, orgIdParam: string, deps?: JoinDeps): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) return errorResponse("not_found", "Organization not found", 404, requestId);
  if (!deps?.repo && !env.PLATFORM_DB) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  const { repo, executor } = repoFor(env, deps);
  try {
    const denied = await requireManager(env, requestId, actor, orgUuid, "organization.join_code.rotate", repo);
    if (denied) return denied;
    for (let attempt = 0; attempt < 3; attempt++) {
      const set = await repo.setOrganizationJoinCode(orgUuid, generateJoinCode(), new Date());
      if (set.ok) return successResponse({ code: set.value.joinCode }, requestId);
      if (set.error.kind !== "conflict") return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return errorResponse("internal_error", "Could not rotate the join code", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /v1/join — a signed-in user requests to join by code (cross-org, no policy). */
export async function handleSubmitJoinRequest(request: Request, env: Env, requestId: string, actor: ActorContext, deps?: JoinDeps): Promise<Response> {
  if (!deps?.repo && !env.PLATFORM_DB) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }
  const code = (body as { code?: unknown })?.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    return validationError(requestId, { code: ["A join code is required"] });
  }

  const { repo, executor } = repoFor(env, deps);
  try {
    const org = await repo.getOrganizationByJoinCode(code.trim().toUpperCase());
    if (!org.ok) return errorResponse("not_found", "No squad found for that code", 404, requestId);

    const created = await repo.createJoinRequest({
      id: crypto.randomUUID(),
      orgId: org.value.id as Uuid,
      subjectId: actor.subjectId,
      subjectType: actor.subjectType,
      requestedRole: "viewer",
      createdAt: new Date(),
    });
    if (!created.ok) {
      if (created.error.kind === "conflict") {
        return errorResponse("conflict", "You've already requested to join this squad", 409, requestId);
      }
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse(
      { request: toPublicJoinRequest(created.value), orgName: org.value.name, orgSlug: org.value.slug },
      requestId,
      201,
    );
  } finally {
    if (executor) await executor.dispose();
  }
}

/** GET /v1/organizations/:orgId/join-requests — list. Manager. */
export async function handleListJoinRequests(env: Env, requestId: string, actor: ActorContext, orgIdParam: string, deps?: JoinDeps): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  if (!orgUuid) return errorResponse("not_found", "Organization not found", 404, requestId);
  if (!deps?.repo && !env.PLATFORM_DB) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  const { repo, executor } = repoFor(env, deps);
  try {
    const denied = await requireManager(env, requestId, actor, orgUuid, "organization.join_request.list", repo);
    if (denied) return denied;
    const result = await repo.listJoinRequests(orgUuid);
    if (!result.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    return successResponse({ joinRequests: result.value.map(toPublicJoinRequest) }, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /v1/organizations/:orgId/join-requests/:id/{approve,decline} — Manager. */
export async function handleDecideJoinRequest(env: Env, requestId: string, actor: ActorContext, orgIdParam: string, reqIdParam: string, approve: boolean, deps?: JoinDeps): Promise<Response> {
  const orgUuid = parseOrgPublicId(orgIdParam);
  const jrUuid = parseJoinRequestPublicId(reqIdParam);
  if (!orgUuid || !jrUuid) return errorResponse("not_found", "Not found", 404, requestId);
  if (!deps?.repo && !env.PLATFORM_DB) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  const { repo, executor } = repoFor(env, deps);
  try {
    const action = approve ? "organization.join_request.approve" : "organization.join_request.decline";
    const denied = await requireManager(env, requestId, actor, orgUuid, action, repo);
    if (denied) return denied;

    if (approve) {
      const result = await repo.approveJoinRequest({
        orgId: orgUuid,
        requestId: jrUuid,
        memberId: crypto.randomUUID(),
        roleAssignmentId: crypto.randomUUID(),
        decidedBy: actor.subjectId,
        decidedAt: new Date(),
      });
      if (!result.ok) {
        if (result.error.kind === "conflict") return errorResponse("conflict", "Already a member", 409, requestId);
        return errorResponse("not_found", "Not found", 404, requestId);
      }
      return successResponse({ request: toPublicJoinRequest(result.value.request) }, requestId);
    }

    const result = await repo.declineJoinRequest(orgUuid, jrUuid, actor.subjectId, new Date());
    if (!result.ok) return errorResponse("not_found", "Not found", 404, requestId);
    return successResponse({ request: toPublicJoinRequest(result.value) }, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
