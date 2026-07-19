import { handleGetOrgSettings, handleSetOrgSettings } from "@matchmaker-worker/handlers/org-settings";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, OrgSettings, SetOrgSettingsInput } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function repo(over: Partial<MatchmakerRepository> = {}): MatchmakerRepository {
  return {
    async getOrgSettings() {
      return { ok: true, value: null };
    },
    async setOrgSettings(orgId: string, input: SetOrgSettingsInput, now: Date) {
      return { ok: true, value: { orgId, whatsappBridge: input.whatsappBridge, updatedAt: now } };
    },
    ...over,
  } as unknown as MatchmakerRepository;
}

/** Captures the `action` string sent to policy-worker so RBAC wiring per-route can be asserted. */
function envCapturingAction(allowValue: boolean): { env: Record<string, unknown>; actions: string[] } {
  const actions: string[] = [];
  const env = {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: {
      fetch: async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string) as { action: string };
        actions.push(body.action);
        return Response.json({ data: { allow: allowValue } });
      },
    },
    ENVIRONMENT: "test",
  };
  return { env, actions };
}

const allow = () => ({
  MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
  POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) },
  ENVIRONMENT: "test",
});
const deny = () => ({
  MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
  POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: false } }) },
  ENVIRONMENT: "test",
});

function putReq(body: unknown): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("handleGetOrgSettings", () => {
  it("returns the null-default shape ({ whatsappBridge: false }) when no row exists", async () => {
    const res = await handleGetOrgSettings(allow() as never, "r1", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { whatsappBridge: boolean } };
    expect(json.data).toEqual({ whatsappBridge: false });
  });

  it("returns the stored value once settings have been written", async () => {
    const r = repo({
      async getOrgSettings() {
        return { ok: true, value: { orgId: ORG, whatsappBridge: true, updatedAt: new Date() } as OrgSettings };
      },
    });
    const res = await handleGetOrgSettings(allow() as never, "r2", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { whatsappBridge: boolean } };
    expect(json.data.whatsappBridge).toBe(true);
  });

  it("is readable by a member under a plain allow policy (not manager-gated)", async () => {
    // Any member (owner/admin/builder/viewer) can read settings per spec §5;
    // this asserts the handler doesn't add its own extra role check on top of policy.
    const res = await handleGetOrgSettings(allow() as never, "r3", { subjectId: "usr_viewer", subjectType: "user" }, ORG, { repo: repo() });
    expect(res.status).toBe(200);
  });

  it("checks organization.settings.read (not .write) for GET", async () => {
    const { env, actions } = envCapturingAction(true);
    const res = await handleGetOrgSettings(env as never, "r4", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    expect(actions).toEqual(["organization.settings.read"]);
  });

  it("denies (opaque 404) when the actor lacks settings.read", async () => {
    const res = await handleGetOrgSettings(deny() as never, "r5", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });
});

describe("handleSetOrgSettings", () => {
  it("upserts whatsappBridge=true", async () => {
    const res = await handleSetOrgSettings(putReq({ whatsappBridge: true }), allow() as never, "r10", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { whatsappBridge: boolean } };
    expect(json.data.whatsappBridge).toBe(true);
  });

  it("upserts whatsappBridge=false", async () => {
    const res = await handleSetOrgSettings(putReq({ whatsappBridge: false }), allow() as never, "r11", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { whatsappBridge: boolean } };
    expect(json.data.whatsappBridge).toBe(false);
  });

  it("rejects a missing whatsappBridge field", async () => {
    const res = await handleSetOrgSettings(putReq({}), allow() as never, "r12", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("rejects a non-boolean whatsappBridge", async () => {
    const res = await handleSetOrgSettings(putReq({ whatsappBridge: "true" }), allow() as never, "r13", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("422s invalid JSON", async () => {
    const req = new Request("https://x/settings", { method: "PUT", body: "{bad" });
    const res = await handleSetOrgSettings(req, allow() as never, "r14", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("checks organization.settings.write (not .read) for PUT", async () => {
    const { env, actions } = envCapturingAction(true);
    const res = await handleSetOrgSettings(putReq({ whatsappBridge: true }), env as never, "r15", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    expect(actions).toEqual(["organization.settings.write"]);
  });

  it("denies (opaque 404) when the actor lacks settings.write (e.g. a builder/viewer)", async () => {
    const res = await handleSetOrgSettings(putReq({ whatsappBridge: true }), deny() as never, "r16", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });

  it("validates the body before checking RBAC", async () => {
    const res = await handleSetOrgSettings(putReq({}), deny() as never, "r17", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });
});
