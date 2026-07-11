import { handleListAvailability } from "@matchmaker-worker/handlers/list-availability";
import { handleSetAvailability } from "@matchmaker-worker/handlers/set-availability";
import { asUuid } from "@saas/db/ids";
import type { Availability, MatchmakerRepository } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function repoWith(rows: Availability[]): MatchmakerRepository {
  return {
    async listAvailability() {
      return { ok: true, value: rows };
    },
    async setAvailability(orgId: string, playerId: string, state: Availability["state"], now: Date) {
      return { ok: true, value: { orgId, playerId, state, updatedAt: now } };
    },
  } as unknown as MatchmakerRepository;
}

function envAllowing(): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) },
    ENVIRONMENT: "test",
  };
}

function envDenying(): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: false } }) },
    ENVIRONMENT: "test",
  };
}

function setRequest(body: unknown): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/availability/plr_x", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("handleListAvailability", () => {
  it("returns the availability rows", async () => {
    const rows: Availability[] = [{ orgId: ORG, playerId: PLAYER, state: "in", updatedAt: new Date() }];
    const res = await handleListAvailability(envAllowing() as never, "req_1", ACTOR, ORG, { repo: repoWith(rows) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { availability: { state: string }[] } };
    expect(json.data.availability).toHaveLength(1);
    expect(json.data.availability[0]!.state).toBe("in");
  });

  it("denies with 404 when policy rejects", async () => {
    const res = await handleListAvailability(envDenying() as never, "req_2", ACTOR, ORG, { repo: repoWith([]) });
    expect(res.status).toBe(404);
  });
});

describe("handleSetAvailability", () => {
  it("upserts a valid state", async () => {
    const res = await handleSetAvailability(setRequest({ state: "maybe" }), envAllowing() as never, "req_3", ACTOR, ORG, PLAYER, {
      repo: repoWith([]),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { availability: { state: string } } };
    expect(json.data.availability.state).toBe("maybe");
  });

  it("rejects an invalid state with 422", async () => {
    const res = await handleSetAvailability(setRequest({ state: "nope" }), envAllowing() as never, "req_4", ACTOR, ORG, PLAYER, {
      repo: repoWith([]),
    });
    expect(res.status).toBe(422);
  });

  it("rejects invalid JSON with 422", async () => {
    const bad = new Request("https://matchmaker.internal/v1/organizations/org_x/availability/plr_x", {
      method: "PUT",
      body: "{not json",
    });
    const res = await handleSetAvailability(bad, envAllowing() as never, "req_5", ACTOR, ORG, PLAYER, { repo: repoWith([]) });
    expect(res.status).toBe(422);
  });

  it("denies with 404 when policy rejects (after validation)", async () => {
    const res = await handleSetAvailability(setRequest({ state: "in" }), envDenying() as never, "req_6", ACTOR, ORG, PLAYER, {
      repo: repoWith([]),
    });
    expect(res.status).toBe(404);
  });
});
