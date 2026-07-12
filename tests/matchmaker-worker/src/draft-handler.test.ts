import { handleDraft } from "@matchmaker-worker/handlers/draft";
import { playerPublicId } from "@matchmaker-worker/ids";
import { asUuid, type Uuid } from "@saas/db/ids";
import type { MatchmakerRepository, Player } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function player(id: string, position: Player["position"], rating: number): Player {
  return {
    id,
    orgId: ORG,
    name: `P-${id}`,
    position,
    rating,
    attributes: {},
    status: "active",
    isCaptain: false,
    email: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  };
}

function repoWith(players: Player[]): MatchmakerRepository {
  return {
    async listActivePlayers() {
      return { ok: true, value: players };
    },
    async listActivePlayersByIds(_org: Uuid, ids: Uuid[]) {
      return { ok: true, value: players.filter((p) => ids.includes(p.id as Uuid)) };
    },
    async listPlayerVoteStats() {
      return { ok: true, value: [] };
    },
  } as unknown as MatchmakerRepository;
}

// Stub the two downstream bindings: membership returns an (empty) context and
// policy allows. Auth logic is exercised end to end; only the network is faked.
function envAllowing(): Record<string, unknown> {
  const membership = {
    fetch: async () => Response.json({ data: { memberships: [] } }),
  };
  const policy = {
    fetch: async () => Response.json({ data: { allow: true } }),
  };
  return { MEMBERSHIP_WORKER: membership, POLICY_WORKER: policy, ENVIRONMENT: "test" };
}

function envDenying(): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: false } }) },
    ENVIRONMENT: "test",
  };
}

function draftRequest(body: unknown): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const ROSTER: Player[] = [
  player("11111111-1111-1111-1111-111111111111", "GK", 88),
  player("22222222-2222-2222-2222-222222222222", "GK", 85),
  player("33333333-3333-3333-3333-333333333333", "DEF", 90),
  player("44444444-4444-4444-4444-444444444444", "MID", 89),
  player("55555555-5555-5555-5555-555555555555", "FWD", 94),
  player("66666666-6666-6666-6666-666666666666", "FWD", 91),
];

describe("handleDraft", () => {
  it("drafts balanced teams for a sufficient roster", async () => {
    const res = await handleDraft(draftRequest({ teamCount: 2 }), envAllowing() as never, "req_1", ACTOR, ORG, {
      repo: repoWith(ROSTER),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { teams: { players: unknown[] }[]; ratingSpread: number } };
    expect(json.data.teams).toHaveLength(2);
    expect(json.data.teams[0]!.players.length + json.data.teams[1]!.players.length).toBe(6);
  });

  it("returns 412 when the roster is smaller than the team count", async () => {
    const res = await handleDraft(draftRequest({ teamCount: 2 }), envAllowing() as never, "req_2", ACTOR, ORG, {
      repo: repoWith([ROSTER[0]!]),
    });
    expect(res.status).toBe(412);
  });

  it("rejects an out-of-range team count with 422", async () => {
    const res = await handleDraft(draftRequest({ teamCount: 1 }), envAllowing() as never, "req_3", ACTOR, ORG, {
      repo: repoWith(ROSTER),
    });
    expect(res.status).toBe(422);
  });

  it("rejects an invalid player id with 422", async () => {
    const res = await handleDraft(
      draftRequest({ playerIds: ["not-a-player-id"] }),
      envAllowing() as never,
      "req_4",
      ACTOR,
      ORG,
      { repo: repoWith(ROSTER) },
    );
    expect(res.status).toBe(422);
  });

  it("denies with 404 when policy rejects", async () => {
    const res = await handleDraft(draftRequest({ teamCount: 2 }), envDenying() as never, "req_5", ACTOR, ORG, {
      repo: repoWith(ROSTER),
    });
    expect(res.status).toBe(404);
  });

  it("filters to the supplied player ids", async () => {
    const ids = [playerPublicId(ROSTER[2]!.id), playerPublicId(ROSTER[3]!.id), playerPublicId(ROSTER[4]!.id), playerPublicId(ROSTER[5]!.id)];
    const res = await handleDraft(draftRequest({ teamCount: 2, playerIds: ids }), envAllowing() as never, "req_6", ACTOR, ORG, {
      repo: repoWith(ROSTER),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { teams: { players: unknown[] }[] } };
    const total = json.data.teams.reduce((a, t) => a + t.players.length, 0);
    expect(total).toBe(4);
  });
});
