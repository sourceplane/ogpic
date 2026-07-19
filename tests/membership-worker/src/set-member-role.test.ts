import crypto from "node:crypto";
import { handleSetMemberRole } from "@membership-worker/handlers/set-member-role";
import type {
  MembershipResult,
  OrganizationMember,
  RoleAssignment,
} from "@saas/db/membership";
import type { AppendEventWithAuditInput, StoredEvent, StoredAuditEntry } from "@saas/db/events";
import type { Env } from "@membership-worker/env";

if (!(globalThis as Record<string, unknown>).crypto) {
  (globalThis as Record<string, unknown>).crypto = crypto;
}

type MembershipView = { memberId: string; role: string };
type JsonResp = {
  data: { membership: MembershipView };
  error: { code: string; message: string; details: { fields?: Record<string, string[]>; reason?: string }; requestId: string };
};

const orgUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const orgPublicIdStr = `org_${orgUuid.replace(/-/g, "")}`;
const memberUuid = "11111111-2222-3333-4444-555555555555";
const memberPublicIdStr = `mem_${memberUuid.replace(/-/g, "")}`;
const actor = { subjectId: "usr_admin", subjectType: "user" };
const fixedNowLocal = new Date("2026-01-15T10:00:00.000Z");

function createPolicyFetcher(allow: boolean, captureBody?: { value: unknown }) {
  return {
    fetch: async (_url: string, init: RequestInit) => {
      if (captureBody) captureBody.value = JSON.parse(init.body as string);
      return Response.json({
        data: { allow, reason: allow ? "granted" : "denied", policyVersion: 1, derivedScope: {} },
        meta: { requestId: "req_test", cursor: null },
      });
    },
  } as unknown as Fetcher;
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request("http://localhost/test", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

interface RepoOpts {
  memberNotFound?: boolean;
  memberRemoved?: boolean;
  actorRolesFail?: boolean;
  targetRolesFail?: boolean;
  targetRoles?: RoleAssignment[];
  setMemberRoleFail?: boolean;
}

function makeTargetRole(role: string): RoleAssignment {
  return {
    id: "ra-current-1",
    orgId: orgUuid,
    subjectId: "usr_target",
    subjectType: "user",
    role,
    scopeKind: "organization",
    scopeRef: null,
    createdAt: fixedNowLocal,
    revokedAt: null,
  };
}

function createMemberRepo(opts: RepoOpts = {}) {
  const member: OrganizationMember = {
    id: memberUuid,
    orgId: orgUuid,
    subjectId: "usr_target",
    subjectType: "user",
    status: "active",
    createdAt: fixedNowLocal,
    updatedAt: fixedNowLocal,
  };
  const currentRoles: RoleAssignment[] = opts.targetRoles ?? [makeTargetRole("viewer")];
  const setCalls: Array<{ orgId: string; subjectId: string; subjectType: string; role: string }> = [];

  return {
    setCalls,
    listRoleAssignments: async (_id: string, subjectId: string): Promise<MembershipResult<RoleAssignment[]>> => {
      if (opts.actorRolesFail && subjectId === actor.subjectId) {
        return { ok: false, error: { kind: "internal", message: "db error" } };
      }
      if (subjectId === "usr_target") {
        if (opts.targetRolesFail) {
          return { ok: false, error: { kind: "internal", message: "db error" } };
        }
        return { ok: true, value: currentRoles };
      }
      return {
        ok: true,
        value: [
          {
            id: "ra-actor",
            orgId: orgUuid,
            subjectId: actor.subjectId,
            subjectType: "user",
            role: "admin",
            scopeKind: "organization",
            scopeRef: null,
            createdAt: fixedNowLocal,
            revokedAt: null,
          },
        ],
      };
    },
    getMemberById: async (_orgId: string, _memberId: string): Promise<MembershipResult<OrganizationMember>> => {
      if (opts.memberNotFound) return { ok: false, error: { kind: "not_found" } };
      if (opts.memberRemoved) return { ok: false, error: { kind: "removed" } };
      return { ok: true, value: member };
    },
    setMemberRole: async (
      orgId: string,
      subjectId: string,
      subjectType: string,
      role: string,
      roleAssignmentId: string,
      now: Date,
    ): Promise<MembershipResult<RoleAssignment>> => {
      setCalls.push({ orgId, subjectId, subjectType, role });
      if (opts.setMemberRoleFail) return { ok: false, error: { kind: "internal", message: "set failed" } };
      return {
        ok: true,
        value: {
          id: roleAssignmentId,
          orgId,
          subjectId,
          subjectType,
          role,
          scopeKind: "organization",
          scopeRef: null,
          createdAt: now,
          revokedAt: null,
        },
      };
    },
  };
}

function makeEventsRepo() {
  let appendedInput: AppendEventWithAuditInput | null = null;
  let appendCount = 0;
  return {
    get appendedInput() {
      return appendedInput;
    },
    get appendCount() {
      return appendCount;
    },
    appendEventWithAudit: async (input: AppendEventWithAuditInput) => {
      appendedInput = input;
      appendCount += 1;
      return { ok: true as const, value: { event: {} as StoredEvent, audit: {} as StoredAuditEntry } };
    },
  };
}

function makeFailingEventsRepo() {
  return {
    appendEventWithAudit: async () => ({ ok: false as const, error: { kind: "internal" as const, message: "db error" } }),
  };
}

describe("handleSetMemberRole", () => {
  describe("happy path", () => {
    it("promotes a viewer to admin, calls setMemberRole, and appends membership.role_changed", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("viewer")] });
      const eventsRepo = makeEventsRepo();
      const policyCapture = { value: null as unknown };
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true, policyCapture), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal, generateId: () => "generated_evt_1" },
      );

      expect(response.status).toBe(200);
      const json = await response.json() as JsonResp;
      expect(json.data.membership.memberId).toBe(memberPublicIdStr);
      expect(json.data.membership.role).toBe("admin");

      // Repo was actually asked to flip the role
      expect(repo.setCalls).toHaveLength(1);
      expect(repo.setCalls[0]).toMatchObject({ orgId: orgUuid, subjectId: "usr_target", subjectType: "user", role: "admin" });

      // Policy called with the correct action/resource
      expect(policyCapture.value).not.toBeNull();
      const policyBody = policyCapture.value as { action: string; resource: { kind: string; id: string; orgId: string } };
      expect(policyBody.action).toBe("organization.member_role.set");
      expect(policyBody.resource.kind).toBe("member");
      expect(policyBody.resource.orgId).toBe(orgUuid);

      // Event/audit appended correctly
      expect(eventsRepo.appendCount).toBe(1);
      const appended = eventsRepo.appendedInput!;
      expect(appended.event.type).toBe("membership.role_changed");
      expect(appended.event.version).toBe(1);
      expect(appended.event.source).toBe("membership-worker");
      expect(appended.event.actorType).toBe("user");
      expect(appended.event.actorId).toBe("usr_admin");
      expect(appended.event.subjectKind).toBe("member");
      expect(appended.event.subjectId).toBe(memberUuid);
      expect(appended.event.orgId).toBe(orgUuid);
      expect(appended.event.requestId).toBe("req_test");
      expect(appended.event.payload.role).toBe("admin");
      expect(appended.event.payload.previousRole).toBe("viewer");
      expect(appended.event.payload.memberId).toBe(memberPublicIdStr);
      expect(appended.audit.category).toBe("membership");
      expect(appended.audit.description).toContain(memberPublicIdStr);
      expect(appended.audit.description).toContain("admin");
    });

    it("demotes an admin to viewer, calls setMemberRole, and appends membership.role_changed", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("admin")] });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "viewer" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal, generateId: () => "generated_evt_2" },
      );

      expect(response.status).toBe(200);
      const json = await response.json() as JsonResp;
      expect(json.data.membership.role).toBe("viewer");

      expect(repo.setCalls).toHaveLength(1);
      expect(repo.setCalls[0]).toMatchObject({ role: "viewer" });

      expect(eventsRepo.appendCount).toBe(1);
      const appended = eventsRepo.appendedInput!;
      expect(appended.event.payload.previousRole).toBe("admin");
      expect(appended.event.payload.role).toBe("viewer");
    });
  });

  describe("same-role no-op", () => {
    it("returns 200 without calling setMemberRole or appending an event when target already has the requested role (admin -> admin)", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("admin")] });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(200);
      const json = await response.json() as JsonResp;
      expect(json.data.membership.role).toBe("admin");
      expect(json.data.membership.memberId).toBe(memberPublicIdStr);

      expect(repo.setCalls).toHaveLength(0);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("returns 200 without calling setMemberRole or appending an event when target already has the requested role (viewer -> viewer)", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("viewer")] });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "viewer" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(200);
      const json = await response.json() as JsonResp;
      expect(json.data.membership.role).toBe("viewer");
      expect(repo.setCalls).toHaveLength(0);
      expect(eventsRepo.appendCount).toBe(0);
    });
  });

  describe("owner target conflict", () => {
    it("returns 409 conflict and appends no event when the target is the org owner", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("owner")] });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "viewer" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(409);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("conflict");
      expect(repo.setCalls).toHaveLength(0);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("returns 409 even when requesting to set the owner to 'admin' (no accidental no-op)", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("owner")] });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(409);
      expect(eventsRepo.appendCount).toBe(0);
    });
  });

  describe("validation", () => {
    it("rejects invalid JSON body", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRawRequest("{ not json"),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(422);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("validation_failed");
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("rejects a missing role field", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({}),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(422);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("validation_failed");
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("rejects 'owner' as a settable role (this endpoint never grants owner)", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "owner" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(422);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("validation_failed");
      expect(repo.setCalls).toHaveLength(0);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("rejects an unrecognized role string", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "superadmin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(422);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("rejects a non-string role", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: 123 }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(422);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("invalid org ID returns 404 and appends no event", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, "bad_org_id", memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(404);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("invalid member ID returns 404 and appends no event", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, "not-a-member-id",
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(404);
      expect(eventsRepo.appendCount).toBe(0);
    });
  });

  describe("not found", () => {
    it("returns 404 when the target member does not exist", async () => {
      const repo = createMemberRepo({ memberNotFound: true });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(404);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("not_found");
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("returns 404 when the target member has been removed", async () => {
      const repo = createMemberRepo({ memberRemoved: true });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(404);
      expect(eventsRepo.appendCount).toBe(0);
    });
  });

  describe("RBAC denial", () => {
    it("returns opaque 404 (not 403) when policy denies, and appends no event", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(false), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(404);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("not_found");
      // Must not leak the real reason (opaque 404, not a 403)
      expect(JSON.stringify(json)).not.toContain("forbidden");
      expect(JSON.stringify(json)).not.toContain("denied");
      expect(repo.setCalls).toHaveLength(0);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("returns opaque 404 when the actor's own role lookup fails (does not leak org existence)", async () => {
      const repo = createMemberRepo({ actorRolesFail: true });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(404);
      expect(eventsRepo.appendCount).toBe(0);
    });
  });

  describe("service configuration", () => {
    it("missing POLICY_WORKER returns 503 and appends no event", async () => {
      const repo = createMemberRepo();
      const eventsRepo = makeEventsRepo();
      const env: Env = { PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(503);
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("missing PLATFORM_DB without injected deps returns 503", async () => {
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
      );

      expect(response.status).toBe(503);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("internal_error");
    });
  });

  describe("failure paths", () => {
    it("returns 500 when the target's role lookup fails", async () => {
      const repo = createMemberRepo({ targetRolesFail: true });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(500);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("internal_error");
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("returns 500 when setMemberRole itself fails, and appends no event", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("viewer")], setMemberRoleFail: true });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(500);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("internal_error");
      expect(eventsRepo.appendCount).toBe(0);
    });

    it("event/audit append failure returns a safe 500 without leaking internals", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("viewer")] });
      const eventsRepo = makeFailingEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal },
      );

      expect(response.status).toBe(500);
      const json = await response.json() as JsonResp;
      expect(json.error.code).toBe("internal_error");
      const text = JSON.stringify(json);
      expect(text).not.toContain("db error");
      expect(text).not.toContain("stack");
      expect(text).not.toContain("SQL");
    });
  });

  describe("response shape", () => {
    it("uses public member IDs, never raw UUIDs, in the response body", async () => {
      const repo = createMemberRepo({ targetRoles: [makeTargetRole("viewer")] });
      const eventsRepo = makeEventsRepo();
      const env: Env = { POLICY_WORKER: createPolicyFetcher(true), PLATFORM_DB: {} as Hyperdrive, ENVIRONMENT: "test" };

      const response = await handleSetMemberRole(
        makeRequest({ role: "admin" }),
        env, "req_test", actor, orgPublicIdStr, memberPublicIdStr,
        { repo, eventsRepo, now: () => fixedNowLocal, generateId: () => "gen_id" },
      );

      const json = await response.json() as JsonResp;
      expect(json.data.membership.memberId).toMatch(/^mem_[0-9a-f]{32}$/);
      expect(JSON.stringify(json)).not.toContain(memberUuid);
    });
  });
});
