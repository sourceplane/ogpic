import { handleGetRatingRound, handleOpenRatingRound, handleCloseRatingRound } from "@matchmaker-worker/handlers/rating-round";
import { asUuid } from "@saas/db/ids";
import type {
  InsertRatingRoundResultInput,
  MatchmakerRepository,
  Player,
  PlayerVoteStats,
  RatingRound,
  RatingRoundResult,
} from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER_A = asUuid("11111111-1111-1111-1111-111111111111");
const PLAYER_B = asUuid("22222222-2222-2222-2222-222222222222");
const ROUND = asUuid("99999999-9999-9999-9999-999999999999");
const ROUND_2 = asUuid("88888888-8888-8888-8888-888888888888");
const ACTOR = { subjectId: "usr_m", subjectType: "user" };

function round(status: "open" | "closed", overrides: Partial<RatingRound> = {}): RatingRound {
  return {
    id: ROUND,
    orgId: ORG,
    status,
    openedBy: "usr_m",
    openedAt: new Date(),
    closedAt: status === "closed" ? new Date() : null,
    deadlineKind: "manual",
    deadlineAt: null,
    ...overrides,
  };
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: PLAYER_A,
    orgId: ORG,
    name: "Sam Okafor",
    position: "MID",
    rating: 60,
    attributes: { PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 },
    email: null,
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

interface Opts {
  openExists?: boolean;
  openConflict?: boolean;
  closeFound?: boolean;
  resetCalls?: string[];
  players?: Player[];
  voteStats?: PlayerVoteStats[];
  closedRound?: RatingRound | null;
  closedResults?: RatingRoundResult[];
  insertedRows?: InsertRatingRoundResultInput[];
  openedInputs?: unknown[];
}

function repo(o: Opts = {}): MatchmakerRepository {
  return {
    async getOpenRatingRound() {
      return { ok: true, value: o.openExists ? round("open") : null };
    },
    async getLatestClosedRatingRound() {
      return { ok: true, value: o.closedRound === undefined ? null : o.closedRound };
    },
    async openRatingRound(input: unknown) {
      o.openedInputs?.push(input);
      return o.openConflict ? { ok: false, error: { kind: "conflict", entity: "rating_round" } } : { ok: true, value: round("open") };
    },
    async closeRatingRound() {
      return o.closeFound === false ? { ok: false, error: { kind: "not_found" } } : { ok: true, value: round("closed") };
    },
    async resetScoresToBaseline() {
      o.resetCalls?.push("reset");
      return { ok: true, value: undefined };
    },
    async listActivePlayers() {
      return { ok: true, value: o.players ?? [player()] };
    },
    async listPlayerVoteStats() {
      return { ok: true, value: o.voteStats ?? [] };
    },
    async insertRatingRoundResults(rows: InsertRatingRoundResultInput[]) {
      o.insertedRows?.push(...rows);
      return { ok: true, value: undefined };
    },
    async listRatingRoundResults() {
      return { ok: true, value: o.closedResults ?? [] };
    },
    async insertChatMessage(input: unknown) {
      return { ok: true, value: { ...(input as object), reactions: {} } as never };
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
function envAllowingOnly(action: string): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: {
      fetch: async (_url: string, init?: RequestInit) => {
        const parsed = init?.body ? (JSON.parse(init.body as string) as { action?: string }) : {};
        return Response.json({ data: { allow: parsed.action === action } });
      },
    },
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
function openReq(body: unknown = {}): Request {
  return new Request("https://x/rating-round/open", { method: "POST", body: JSON.stringify(body) });
}

describe("rating rounds", () => {
  it("returns the open round state", async () => {
    const res = await handleGetRatingRound(envAllowing() as never, "req_1", ACTOR, ORG, { repo: repo({ openExists: true }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { status: string } };
    expect(json.data.status).toBe("open");
  });

  it("returns closed status with no results when nothing has ever run", async () => {
    const res = await handleGetRatingRound(envAllowing() as never, "req_2", ACTOR, ORG, { repo: repo({ openExists: false }) });
    const json = (await res.json()) as { data: { status: string; results?: unknown } };
    expect(json.data.status).toBe("closed");
    expect(json.data.results).toBeUndefined();
  });

  it("opens a round with a deadline (201) and computes deadlineAt ~24h out", async () => {
    const openedInputs: unknown[] = [];
    const before = Date.now();
    const res = await handleOpenRatingRound(
      openReq({ deadline: "24h" }),
      envAllowing() as never,
      "req_3",
      ACTOR,
      ORG,
      { repo: repo({ openedInputs }) },
    );
    expect(res.status).toBe(201);
    expect(openedInputs).toHaveLength(1);
    const input = openedInputs[0] as { deadlineKind: string; deadlineAt: Date | null };
    expect(input.deadlineKind).toBe("24h");
    expect(input.deadlineAt).not.toBeNull();
    const deltaMs = input.deadlineAt!.getTime() - before;
    expect(deltaMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(deltaMs).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("defaults to a manual deadline when none is given", async () => {
    const openedInputs: unknown[] = [];
    const res = await handleOpenRatingRound(openReq({}), envAllowing() as never, "req_3b", ACTOR, ORG, {
      repo: repo({ openedInputs }),
    });
    expect(res.status).toBe(201);
    const input = openedInputs[0] as { deadlineKind: string; deadlineAt: Date | null };
    expect(input.deadlineKind).toBe("manual");
    expect(input.deadlineAt).toBeNull();
  });

  it("422s an invalid deadline", async () => {
    const res = await handleOpenRatingRound(openReq({ deadline: "1w" }), envAllowing() as never, "req_3c", ACTOR, ORG, {
      repo: repo(),
    });
    expect(res.status).toBe(422);
  });

  it("resets scores when asked", async () => {
    const resetCalls: string[] = [];
    const res = await handleOpenRatingRound(openReq({ resetScores: true }), envAllowing() as never, "req_4", ACTOR, ORG, { repo: repo({ resetCalls }) });
    expect(res.status).toBe(201);
    expect(resetCalls).toEqual(["reset"]);
  });

  it("409s when a round is already open", async () => {
    const res = await handleOpenRatingRound(openReq({}), envAllowing() as never, "req_5", ACTOR, ORG, { repo: repo({ openConflict: true }) });
    expect(res.status).toBe(409);
  });

  it("closes the open round and settles: writes a result row per rated player with the correct delta", async () => {
    const insertedRows: InsertRatingRoundResultInput[] = [];
    const players = [player({ id: PLAYER_A, rating: 60 }), player({ id: PLAYER_B, rating: 50 })];
    const voteStats: PlayerVoteStats[] = [
      { playerId: PLAYER_A, voterCount: 2, avgStars: 5 }, // rated -> moves
      { playerId: PLAYER_B, voterCount: 0, avgStars: 0 }, // unrated -> no row
    ];
    const res = await handleCloseRatingRound(envAllowing() as never, "req_6", ACTOR, ORG, {
      repo: repo({ players, voteStats, insertedRows }),
    });
    expect(res.status).toBe(200);
    expect(insertedRows).toHaveLength(1);
    const row = insertedRows[0]!;
    expect(row.playerId).toBe(PLAYER_A);
    expect(row.ovrBefore).toBe(60);
    // effectiveRating(60, 2 voters, 5 avg stars) blends toward the 99-band community score.
    expect(row.ovrAfter).toBeGreaterThan(row.ovrBefore);
    expect(row.votesReceived).toBe(2);
  });

  it("404s closing when none is open", async () => {
    const res = await handleCloseRatingRound(envAllowing() as never, "req_7", ACTOR, ORG, { repo: repo({ closeFound: false }) });
    expect(res.status).toBe(404);
  });

  it("GET surfaces the latest closed round's settled deltas", async () => {
    const closedRound = round("closed", { id: ROUND_2 });
    const closedResults: RatingRoundResult[] = [
      { roundId: ROUND_2, orgId: ORG, playerId: PLAYER_A, ovrBefore: 60, ovrAfter: 66, votesReceived: 3, createdAt: new Date() },
    ];
    const res = await handleGetRatingRound(envAllowing() as never, "req_8", ACTOR, ORG, {
      repo: repo({ openExists: false, closedRound, closedResults }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: { results?: { playerId: string; ovrBefore: number; ovrAfter: number; delta: number; votesReceived: number }[] };
    };
    expect(json.data.results).toHaveLength(1);
    expect(json.data.results![0]!.delta).toBe(6);
    expect(json.data.results![0]!.votesReceived).toBe(3);
  });

  it("denies open when policy rejects", async () => {
    const res = await handleOpenRatingRound(openReq({}), envDenying() as never, "req_9", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });

  it("GET is member-level (organization.roster.read), not manager-gated", async () => {
    const res = await handleGetRatingRound(envAllowingOnly("organization.roster.read") as never, "req_10", ACTOR, ORG, {
      repo: repo({ openExists: true }),
    });
    expect(res.status).toBe(200);
  });

  it("open/close require the manager action (organization.roster.write)", async () => {
    const openRes = await handleOpenRatingRound(openReq({}), envAllowingOnly("organization.roster.write") as never, "req_11", ACTOR, ORG, {
      repo: repo(),
    });
    expect(openRes.status).toBe(201);
    const closeRes = await handleCloseRatingRound(envAllowingOnly("organization.roster.write") as never, "req_12", ACTOR, ORG, {
      repo: repo(),
    });
    expect(closeRes.status).toBe(200);
  });
});
