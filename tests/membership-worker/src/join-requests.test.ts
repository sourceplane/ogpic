import {
  handleGetJoinCode,
  handleSubmitJoinRequest,
  handleListJoinRequests,
  handleDecideJoinRequest,
} from "@membership-worker/handlers/join";
import { orgPublicId, joinRequestPublicId } from "@membership-worker/ids";
import { asUuid } from "@saas/db";
import type { JoinRequest, MembershipRepository, Organization } from "@saas/db/membership";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const ORG_PUB = orgPublicId(ORG);
const JR = asUuid("11111111-1111-1111-1111-111111111111");
const JR_PUB = joinRequestPublicId(JR);
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function org(joinCode: string | null): Organization {
  return {
    id: ORG, name: "Northside FC", slug: "northside", slugLower: "northside",
    status: "active", parentOrgId: null, joinCode,
    createdAt: new Date(), updatedAt: new Date(),
  };
}
function jr(status: JoinRequest["status"]): JoinRequest {
  return { id: JR, orgId: ORG, subjectId: "usr_2", subjectType: "user", status, requestedRole: "viewer", createdAt: new Date(), decidedAt: null, decidedBy: null };
}

function repo(over: Partial<MembershipRepository>): MembershipRepository {
  return {
    async listRoleAssignments() { return { ok: true, value: [] }; },
    ...over,
  } as unknown as MembershipRepository;
}

function envAllow(): Record<string, unknown> {
  return { POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) } };
}
function envDeny(): Record<string, unknown> {
  return { POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: false } }) } };
}

describe("join code (manager)", () => {
  it("returns an existing join code", async () => {
    const res = await handleGetJoinCode(envAllow() as never, "req_1", ACTOR, ORG_PUB, {
      repo: repo({ getOrganizationById: async () => ({ ok: true, value: org("ABC234") }) }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as { data: { code: string } }).data.code).toBe("ABC234");
  });

  it("mints a code when absent", async () => {
    let minted: string | null = null;
    const res = await handleGetJoinCode(envAllow() as never, "req_2", ACTOR, ORG_PUB, {
      repo: repo({
        getOrganizationById: async () => ({ ok: true, value: org(null) }),
        setOrganizationJoinCode: async (_o, code) => { minted = code; return { ok: true, value: org(code) }; },
      }),
    });
    expect(res.status).toBe(200);
    expect(minted).toMatch(/^[A-Z2-9]{6}$/);
  });

  it("denies a non-manager with 404", async () => {
    const res = await handleGetJoinCode(envDeny() as never, "req_3", ACTOR, ORG_PUB, {
      repo: repo({ getOrganizationById: async () => ({ ok: true, value: org("ABC234") }) }),
    });
    expect(res.status).toBe(404);
  });
});

describe("submit join request (cross-org)", () => {
  function req(body: unknown): Request {
    return new Request("https://membership.internal/v1/join", { method: "POST", body: JSON.stringify(body) });
  }
  it("creates a pending request for a valid code", async () => {
    const res = await handleSubmitJoinRequest(req({ code: "ABC234" }), envAllow() as never, "req_4", ACTOR, {
      repo: repo({
        getOrganizationByJoinCode: async () => ({ ok: true, value: org("ABC234") }),
        createJoinRequest: async () => ({ ok: true, value: jr("pending") }),
      }),
    });
    expect(res.status).toBe(201);
    const j = await res.json() as { data: { request: { status: string }; orgName: string } };
    expect(j.data.request.status).toBe("pending");
    expect(j.data.orgName).toBe("Northside FC");
  });

  it("404s an unknown code", async () => {
    const res = await handleSubmitJoinRequest(req({ code: "NOPE22" }), envAllow() as never, "req_5", ACTOR, {
      repo: repo({ getOrganizationByJoinCode: async () => ({ ok: false, error: { kind: "not_found" } }) }),
    });
    expect(res.status).toBe(404);
  });

  it("409s a duplicate request", async () => {
    const res = await handleSubmitJoinRequest(req({ code: "ABC234" }), envAllow() as never, "req_6", ACTOR, {
      repo: repo({
        getOrganizationByJoinCode: async () => ({ ok: true, value: org("ABC234") }),
        createJoinRequest: async () => ({ ok: false, error: { kind: "conflict", entity: "join_request" } }),
      }),
    });
    expect(res.status).toBe(409);
  });

  it("422s a missing code", async () => {
    const res = await handleSubmitJoinRequest(req({}), envAllow() as never, "req_7", ACTOR, { repo: repo({}) });
    expect(res.status).toBe(422);
  });
});

describe("decide join request (manager)", () => {
  it("approves → creates the membership", async () => {
    const res = await handleDecideJoinRequest(envAllow() as never, "req_8", ACTOR, ORG_PUB, JR_PUB, true, {
      repo: repo({
        approveJoinRequest: async () => ({
          ok: true,
          value: {
            request: jr("approved"),
            member: { id: asUuid("22222222-2222-2222-2222-222222222222"), orgId: ORG, subjectId: "usr_2", subjectType: "user", status: "active", createdAt: new Date(), updatedAt: new Date() },
            roleAssignment: { id: asUuid("33333333-3333-3333-3333-333333333333"), orgId: ORG, subjectId: "usr_2", subjectType: "user", role: "viewer", scopeKind: "organization", scopeRef: null, revokedAt: null, createdAt: new Date() },
          },
        }),
      }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as { data: { request: { status: string } } }).data.request.status).toBe("approved");
  });

  it("declines", async () => {
    const res = await handleDecideJoinRequest(envAllow() as never, "req_9", ACTOR, ORG_PUB, JR_PUB, false, {
      repo: repo({ declineJoinRequest: async () => ({ ok: true, value: jr("declined") }) }),
    });
    expect(res.status).toBe(200);
  });

  it("denies a non-manager with 404", async () => {
    const res = await handleDecideJoinRequest(envDeny() as never, "req_10", ACTOR, ORG_PUB, JR_PUB, true, {
      repo: repo({ approveJoinRequest: async () => ({ ok: true }) as never }),
    });
    expect(res.status).toBe(404);
  });
});

describe("list join requests (manager)", () => {
  it("lists", async () => {
    const res = await handleListJoinRequests(envAllow() as never, "req_11", ACTOR, ORG_PUB, {
      repo: repo({ listJoinRequests: async () => ({ ok: true, value: [jr("pending")] }) }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as { data: { joinRequests: unknown[] } }).data.joinRequests).toHaveLength(1);
  });
});
