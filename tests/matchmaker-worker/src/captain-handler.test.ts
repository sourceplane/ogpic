import { handleSetCaptain } from "@matchmaker-worker/handlers/set-captain";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, Player } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function player(isCaptain: boolean): Player {
  return {
    id: PLAYER,
    orgId: ORG,
    name: "Cap",
    position: "MID",
    rating: 80,
    attributes: {},
    status: "active",
    isCaptain,
    email: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  };
}

function repo(found: boolean): MatchmakerRepository {
  return {
    async setCaptain() {
      return found ? { ok: true, value: player(true) } : { ok: false, error: { kind: "not_found" } };
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

describe("handleSetCaptain", () => {
  it("sets the captain and returns the player", async () => {
    const res = await handleSetCaptain(envAllowing() as never, "req_1", ACTOR, ORG, PLAYER, { repo: repo(true) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { player: { isCaptain: boolean } } };
    expect(json.data.player.isCaptain).toBe(true);
  });

  it("returns 404 for an unknown player", async () => {
    const res = await handleSetCaptain(envAllowing() as never, "req_2", ACTOR, ORG, PLAYER, { repo: repo(false) });
    expect(res.status).toBe(404);
  });

  it("denies with 404 when policy rejects", async () => {
    const res = await handleSetCaptain(envDenying() as never, "req_3", ACTOR, ORG, PLAYER, { repo: repo(true) });
    expect(res.status).toBe(404);
  });
});
