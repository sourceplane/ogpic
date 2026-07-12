import { handleGetRatingRound, handleOpenRatingRound, handleCloseRatingRound } from "@matchmaker-worker/handlers/rating-round";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, RatingRound } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const ACTOR = { subjectId: "usr_m", subjectType: "user" };

function round(status: "open" | "closed"): RatingRound {
  return { id: "r1", orgId: ORG, status, openedBy: "usr_m", openedAt: new Date(), closedAt: status === "closed" ? new Date() : null };
}

interface Opts {
  openExists?: boolean;
  openConflict?: boolean;
  closeFound?: boolean;
  resetCalls?: string[];
}

function repo(o: Opts = {}): MatchmakerRepository {
  return {
    async getOpenRatingRound() {
      return { ok: true, value: o.openExists ? round("open") : null };
    },
    async openRatingRound() {
      return o.openConflict ? { ok: false, error: { kind: "conflict", entity: "rating_round" } } : { ok: true, value: round("open") };
    },
    async closeRatingRound() {
      return o.closeFound === false ? { ok: false, error: { kind: "not_found" } } : { ok: true, value: round("closed") };
    },
    async resetScoresToBaseline() {
      o.resetCalls?.push("reset");
      return { ok: true, value: undefined };
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
function openReq(body: unknown = {}): Request {
  return new Request("https://x/rating-round/open", { method: "POST", body: JSON.stringify(body) });
}

describe("rating rounds", () => {
  it("returns the open round", async () => {
    const res = await handleGetRatingRound(envAllowing() as never, "req_1", ACTOR, ORG, { repo: repo({ openExists: true }) });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { round: { status: string } | null } };
    expect(json.data.round?.status).toBe("open");
  });

  it("returns null when voting is closed", async () => {
    const res = await handleGetRatingRound(envAllowing() as never, "req_2", ACTOR, ORG, { repo: repo({ openExists: false }) });
    const json = (await res.json()) as { data: { round: unknown } };
    expect(json.data.round).toBeNull();
  });

  it("opens a round (201)", async () => {
    const res = await handleOpenRatingRound(openReq({}), envAllowing() as never, "req_3", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(201);
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

  it("closes the open round", async () => {
    const res = await handleCloseRatingRound(envAllowing() as never, "req_6", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
  });

  it("404s closing when none is open", async () => {
    const res = await handleCloseRatingRound(envAllowing() as never, "req_7", ACTOR, ORG, { repo: repo({ closeFound: false }) });
    expect(res.status).toBe(404);
  });

  it("denies open when policy rejects", async () => {
    const res = await handleOpenRatingRound(openReq({}), envDenying() as never, "req_8", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });
});
