import { handleClaimPlayer, handleGetMyPlayer } from "@matchmaker-worker/handlers/claim-player";
import { handleSetAvailability } from "@matchmaker-worker/handlers/set-availability";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, Player } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const ACTOR = { subjectId: "usr_1", subjectType: "user", email: "sam@example.com" };

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: PLAYER,
    orgId: ORG,
    name: "Sam Okafor",
    position: "MID",
    rating: 60,
    attributes: { PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 },
    email: "sam@example.com",
    phone: null,
    status: "active",
    isCaptain: false,
    subjectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...overrides,
  };
}

function repo(over: Partial<MatchmakerRepository> = {}): MatchmakerRepository {
  return {
    async getPlayerById() {
      return { ok: true, value: player() };
    },
    async getPlayerBySubject() {
      return { ok: false, error: { kind: "not_found" } };
    },
    async claimPlayer(_o: string, _p: string, subjectId: string, now: Date) {
      return { ok: true, value: player({ subjectId, updatedAt: now }) };
    },
    async setAvailability(orgId: string, playerId: string, state: "in" | "maybe" | "out", now: Date) {
      return { ok: true, value: { orgId, playerId, state, updatedAt: now } };
    },
    ...over,
  } as unknown as MatchmakerRepository;
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

describe("handleClaimPlayer", () => {
  it("claims an active, unclaimed roster player (self-selection, no email match required)", async () => {
    const res = await handleClaimPlayer(allow() as never, "r1", ACTOR, ORG, PLAYER, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { player: { claimed: boolean } } };
    expect(json.data.player.claimed).toBe(true);
  });

  it("claims even when the roster player's email differs from the caller's (self-selection)", async () => {
    const r = repo({ async getPlayerById() { return { ok: true, value: player({ email: "other@example.com" }) }; } });
    const res = await handleClaimPlayer(allow() as never, "r2", ACTOR, ORG, PLAYER, { repo: r });
    expect(res.status).toBe(200);
  });

  it("claims even when the caller's account has no email (self-selection)", async () => {
    const res = await handleClaimPlayer(allow() as never, "r3", { ...ACTOR, email: null }, ORG, PLAYER, { repo: repo() });
    expect(res.status).toBe(200);
  });

  it("404s when the player does not exist / is not active", async () => {
    const r = repo({ async getPlayerById() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleClaimPlayer(allow() as never, "r3b", ACTOR, ORG, PLAYER, { repo: r });
    expect(res.status).toBe(404);
  });

  it("conflicts (409) when the player is already claimed", async () => {
    const r = repo({ async claimPlayer() { return { ok: false, error: { kind: "conflict", entity: "player" } }; } });
    const res = await handleClaimPlayer(allow() as never, "r4", ACTOR, ORG, PLAYER, { repo: r });
    expect(res.status).toBe(409);
  });
});

describe("handleGetMyPlayer", () => {
  it("returns null when the caller has claimed nobody", async () => {
    const res = await handleGetMyPlayer(allow() as never, "r5", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { player: unknown } };
    expect(json.data.player).toBeNull();
  });

  it("returns the claimed player when present", async () => {
    const r = repo({ async getPlayerBySubject() { return { ok: true, value: player({ subjectId: "usr_1" }) }; } });
    const res = await handleGetMyPlayer(allow() as never, "r6", ACTOR, ORG, { repo: r });
    const json = (await res.json()) as { data: { player: { id: string } | null } };
    expect(json.data.player).not.toBeNull();
  });
});

describe("handleSetAvailability self-service", () => {
  function req(state: string): Request {
    return new Request("https://matchmaker.internal/v1/organizations/org_x/availability/plr_x", {
      method: "PUT",
      body: JSON.stringify({ state }),
    });
  }

  it("lets a non-manager set availability for their own claimed player", async () => {
    const r = repo({ async getPlayerById() { return { ok: true, value: player({ subjectId: "usr_1" }) }; } });
    const res = await handleSetAvailability(req("in") as never, deny() as never, "r7", ACTOR, ORG, PLAYER, { repo: r });
    expect(res.status).toBe(200);
  });

  it("still denies a non-manager for a player they have not claimed", async () => {
    const r = repo({ async getPlayerById() { return { ok: true, value: player({ subjectId: "usr_other" }) }; } });
    const res = await handleSetAvailability(req("in") as never, deny() as never, "r8", ACTOR, ORG, PLAYER, { repo: r });
    expect(res.status).toBe(404);
  });
});
