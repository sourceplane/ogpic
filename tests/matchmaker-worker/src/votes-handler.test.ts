import { handleCastVotes, validateVotes } from "@matchmaker-worker/handlers/cast-votes";
import { handleGetVotes } from "@matchmaker-worker/handlers/get-votes";
import { asUuid } from "@saas/db/ids";
import type { CastVotesInput, MatchmakerRepository, Player, PlayerVote } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const ACTOR = { subjectId: "usr_9", subjectType: "user" };

function player(): Player {
  return {
    id: PLAYER,
    orgId: ORG,
    name: "Winger",
    position: "MID",
    rating: 60,
    attributes: { PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 },
    status: "active",
    isCaptain: false,
    email: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    subjectId: null,
    archivedAt: null,
  };
}

interface RepoOpts {
  found?: boolean;
  cast?: PlayerVote[];
  roundOpen?: boolean;
}

function repo(opts: RepoOpts = {}): MatchmakerRepository {
  const found = opts.found ?? true;
  const roundOpen = opts.roundOpen ?? true;
  let stored: PlayerVote[] = opts.cast ?? [];
  return {
    async getOpenRatingRound() {
      return {
        ok: true,
        value: roundOpen
          ? { id: "r1", orgId: ORG, status: "open" as const, openedBy: "usr_m", openedAt: new Date(), closedAt: null }
          : null,
      };
    },
    async getPlayerById() {
      return found ? { ok: true, value: player() } : { ok: false, error: { kind: "not_found" } };
    },
    async castPlayerVotes(input: CastVotesInput) {
      stored = input.votes;
      return { ok: true, value: undefined };
    },
    async getVoterVotes() {
      return { ok: true, value: stored };
    },
    async getPlayerVoteStats() {
      const voterCount = stored.length ? 1 : 0;
      const avgStars = stored.length ? stored.reduce((a, v) => a + v.stars, 0) / stored.length : 0;
      return { ok: true, value: { playerId: PLAYER, voterCount, avgStars } };
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

function req(body: unknown): Request {
  return new Request("https://x/votes", { method: "POST", body: JSON.stringify(body) });
}

describe("validateVotes", () => {
  it("accepts a valid subset of the position's skills", () => {
    const r = validateVotes({ position: "MID" }, { votes: { PAC: 5, DEF: 3 } });
    expect(r.valid).toBe(true);
  });

  it("rejects a skill not on the position", () => {
    const r = validateVotes({ position: "MID" }, { votes: { DIV: 4 } });
    expect(r.valid).toBe(false);
  });

  it("rejects out-of-range stars", () => {
    expect(validateVotes({ position: "MID" }, { votes: { PAC: 0 } }).valid).toBe(false);
    expect(validateVotes({ position: "MID" }, { votes: { PAC: 6 } }).valid).toBe(false);
    expect(validateVotes({ position: "MID" }, { votes: { PAC: 2.5 } }).valid).toBe(false);
  });

  it("rejects an empty vote map", () => {
    expect(validateVotes({ position: "MID" }, { votes: {} }).valid).toBe(false);
  });
});

describe("handleCastVotes", () => {
  it("records the vote and returns the blended player", async () => {
    const res = await handleCastVotes(req({ votes: { PAC: 5, SHO: 5, PAS: 5, DRI: 5, DEF: 5, PHY: 5 } }), envAllowing() as never, "req_1", ACTOR, ORG, PLAYER, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { player: { rating: number; baseRating: number; voteCount: number }; myVotes: Record<string, number> } };
    expect(json.data.player.baseRating).toBe(60);
    // one 5★ voter, prior 2 at base 60, community 99 → (60*2+99)/3 = 73
    expect(json.data.player.rating).toBe(73);
    expect(json.data.player.voteCount).toBe(1);
    expect(json.data.myVotes.PAC).toBe(5);
  });

  it("returns 422 for an invalid skill", async () => {
    const res = await handleCastVotes(req({ votes: { NOPE: 3 } }), envAllowing() as never, "req_2", ACTOR, ORG, PLAYER, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("returns 404 for an unknown player", async () => {
    const res = await handleCastVotes(req({ votes: { PAC: 3 } }), envAllowing() as never, "req_3", ACTOR, ORG, PLAYER, { repo: repo({ found: false }) });
    expect(res.status).toBe(404);
  });

  it("denies with 404 when policy rejects", async () => {
    const res = await handleCastVotes(req({ votes: { PAC: 3 } }), envDenying() as never, "req_4", ACTOR, ORG, PLAYER, { repo: repo() });
    expect(res.status).toBe(404);
  });

  it("blocks voting with 409 when no rating round is open", async () => {
    const res = await handleCastVotes(req({ votes: { PAC: 3 } }), envAllowing() as never, "req_5", ACTOR, ORG, PLAYER, { repo: repo({ roundOpen: false }) });
    expect(res.status).toBe(409);
  });
});

describe("handleGetVotes", () => {
  it("returns the caller's votes and stats", async () => {
    const res = await handleGetVotes(envAllowing() as never, "req_5", ACTOR, ORG, PLAYER, { repo: repo({ cast: [{ skill: "PAC", stars: 4 }] }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { myVotes: Record<string, number>; stats: { voterCount: number } } };
    expect(json.data.myVotes.PAC).toBe(4);
    expect(json.data.stats.voterCount).toBe(1);
  });

  it("returns 404 for an unknown player", async () => {
    const res = await handleGetVotes(envAllowing() as never, "req_6", ACTOR, ORG, PLAYER, { repo: repo({ found: false }) });
    expect(res.status).toBe(404);
  });
});
