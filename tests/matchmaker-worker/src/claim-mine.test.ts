import { handleClaimMine } from "@matchmaker-worker/handlers/claim-player";
import { asUuid } from "@saas/db/ids";
import type { CreatePlayerInput, MatchmakerRepository, Player } from "@saas/db/matchmaker";

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
    async getPlayerBySubject() {
      return { ok: false, error: { kind: "not_found" } };
    },
    async listActivePlayers() {
      return { ok: true, value: [] };
    },
    async claimPlayer(_o: string, _p: string, subjectId: string, now: Date) {
      return { ok: true, value: player({ subjectId, updatedAt: now }) };
    },
    async createPlayer(input: CreatePlayerInput) {
      return {
        ok: true,
        value: player({
          id: input.id,
          name: input.name,
          position: input.position,
          rating: input.rating,
          attributes: input.attributes,
          email: input.email,
          phone: input.phone,
          subjectId: null,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        }),
      };
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

describe("handleClaimMine", () => {
  it("is idempotent: returns the caller's already-claimed player without touching the roster", async () => {
    let listCalled = false;
    const r = repo({
      async getPlayerBySubject() {
        return { ok: true, value: player({ subjectId: ACTOR.subjectId }) };
      },
      async listActivePlayers() {
        listCalled = true;
        return { ok: true, value: [] };
      },
    });
    const res = await handleClaimMine(allow() as never, "r1", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { player: { id: string; claimed: boolean } } };
    expect(json.data.player.claimed).toBe(true);
    expect(listCalled).toBe(false);
  });

  it("claims an unclaimed roster player whose email matches the caller (case-insensitive)", async () => {
    let claimedId: string | null = null;
    const r = repo({
      async listActivePlayers() {
        return {
          ok: true,
          value: [
            player({ id: asUuid("22222222-2222-2222-2222-222222222222"), email: "OTHER@example.com" }),
            player({ id: PLAYER, email: "Sam@Example.com", subjectId: null }),
          ],
        };
      },
      async claimPlayer(_o: string, playerId: string, subjectId: string, now: Date) {
        claimedId = playerId;
        return { ok: true, value: player({ id: playerId, subjectId, updatedAt: now }) };
      },
    });
    const res = await handleClaimMine(allow() as never, "r2", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(200);
    expect(claimedId).toBe(PLAYER);
    const json = (await res.json()) as { data: { player: { claimed: boolean } } };
    expect(json.data.player.claimed).toBe(true);
  });

  it("mints a fresh roster player when no unclaimed player matches the caller's email", async () => {
    let created = false;
    let claimedNewId: string | null = null;
    const r = repo({
      async listActivePlayers() {
        return { ok: true, value: [player({ email: "someoneelse@example.com" })] };
      },
      async createPlayer(input: CreatePlayerInput) {
        created = true;
        expect(input.email).toBe(ACTOR.email);
        expect(input.position).toBe("ALL");
        return {
          ok: true,
          value: player({ id: input.id, name: input.name, position: input.position, email: input.email, subjectId: null }),
        };
      },
      async claimPlayer(_o: string, playerId: string, subjectId: string, now: Date) {
        claimedNewId = playerId;
        return { ok: true, value: player({ id: playerId, name: "Sam", email: ACTOR.email, subjectId, updatedAt: now }) };
      },
    });
    const res = await handleClaimMine(allow() as never, "r3", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    expect(created).toBe(true);
    expect(claimedNewId).not.toBeNull();
    const json = (await res.json()) as { data: { player: { claimed: boolean; name: string } } };
    expect(json.data.player.claimed).toBe(true);
    expect(json.data.player.name).toBe("Sam"); // capitalized local-part of sam@example.com
  });

  it("denies (404) a caller whose membership/policy check fails", async () => {
    const res = await handleClaimMine(deny() as never, "r4", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });
});
