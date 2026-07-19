import { handleSetDropout, handleUndoDropout, handleResolveDropout } from "@matchmaker-worker/handlers/match-dropouts";
import { playerPublicId } from "@matchmaker-worker/ids";
import { asUuid } from "@saas/db/ids";
import type {
  Match,
  MatchDropout,
  MatchmakerRepository,
  MatchStatus,
  Player,
  UpdateMatchInput,
} from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const MATCH = asUuid("22222222-2222-2222-2222-222222222222");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const DROPPED = asUuid("55555555-5555-5555-5555-555555555555");
const REPLACEMENT = asUuid("66666666-6666-6666-6666-666666666666");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };
const MANAGER = { subjectId: "usr_mgr", subjectType: "user" };

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
    subjectId: "usr_1",
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...overrides,
  };
}

function match(status: MatchStatus, overrides: Partial<Match> = {}): Match {
  return {
    id: MATCH,
    orgId: ORG,
    scheduledAt: new Date("2026-08-01T18:30:00.000Z"),
    status,
    format: null,
    teamA: {
      name: "Home",
      players: [
        { id: playerPublicId(DROPPED), name: "Dropout Dan", position: "DEF", rating: 62 },
        { id: playerPublicId("77777777-7777-7777-7777-777777777777"), name: "Steady Steve", position: "MID", rating: 70 },
      ],
      squadRating: 66,
    },
    teamB: { name: "Away", players: [{ id: "plr_other", name: "Other", position: "FWD", rating: 55 }], squadRating: 55 },
    ratingA: 66,
    ratingB: 55,
    scoreA: null,
    scoreB: null,
    venue: { name: "The Cage", address: null, booked: false, mapsUrl: null },
    shareToken: "tok",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function dropout(overrides: Partial<MatchDropout> = {}): MatchDropout {
  return {
    matchId: MATCH,
    orgId: ORG,
    playerId: PLAYER,
    reason: "Injured",
    resolvedAt: null,
    createdAt: new Date("2026-07-19T09:00:00.000Z"),
    ...overrides,
  };
}

let lastChatInsert: unknown = null;
let lastUpdateMatchInput: UpdateMatchInput | null = null;

function repo(over: Partial<MatchmakerRepository> = {}): MatchmakerRepository {
  return {
    async getPlayerBySubject() {
      return { ok: true, value: player() };
    },
    async getMatchById() {
      return { ok: true, value: match("scheduled") };
    },
    async getPlayerById(_orgId: string, playerId: string) {
      if (playerId === REPLACEMENT) {
        return { ok: true, value: player({ id: REPLACEMENT, name: "Fresh Legs", position: "DEF", rating: 80 }) };
      }
      if (playerId === DROPPED) {
        return { ok: true, value: player({ id: DROPPED, name: "Dropout Dan", position: "DEF", rating: 62 }) };
      }
      return { ok: false, error: { kind: "not_found" } };
    },
    async upsertDropout(_orgId: string, matchId: string, playerId: string, reason: string, now: Date) {
      return { ok: true, value: dropout({ matchId, playerId, reason, createdAt: now }) };
    },
    async deleteDropout() {
      return { ok: true, value: dropout({ resolvedAt: null }) };
    },
    async resolveDropout(_orgId: string, matchId: string, playerId: string, now: Date) {
      return { ok: true, value: dropout({ matchId, playerId, resolvedAt: now }) };
    },
    async insertChatMessage(input: unknown) {
      lastChatInsert = input;
      return { ok: true, value: { id: "msg1" } as never };
    },
    async updateMatch(_orgId: string, _matchId: string, input: UpdateMatchInput) {
      lastUpdateMatchInput = input;
      return { ok: true, value: match("scheduled", { teamA: input.teamA ?? match("scheduled").teamA, teamB: input.teamB ?? match("scheduled").teamB }) };
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

function putReq(body: unknown): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/matches/mtc_x/dropout", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
function resolveReq(body: unknown = {}): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/matches/mtc_x/dropouts/plr_x/resolve", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  lastChatInsert = null;
  lastUpdateMatchInput = null;
});

describe("handleSetDropout", () => {
  it("upserts a dropout for a scheduled match and posts a chat note", async () => {
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r1", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { dropout: { reason: string; resolvedAt: string | null } } };
    expect(json.data.dropout.reason).toBe("Injured");
    expect(json.data.dropout.resolvedAt).toBeNull();
    const note = lastChatInsert as { kind: string; authorPlayerId: string | null; authorSubjectId: string | null; authorName: string | null; matchId: string };
    expect(note.kind).toBe("note");
    expect(note.authorPlayerId).toBe(PLAYER);
    expect(note.authorSubjectId).toBe(ACTOR.subjectId);
    expect(note.authorName).toBe("Sam Okafor");
    expect(note.matchId).toBe(MATCH);
  });

  it("allows dropping out of a draft-status match", async () => {
    const r = repo({ async getMatchById() { return { ok: true, value: match("draft") }; } });
    const res = await handleSetDropout(putReq({ reason: "Work" }), allow() as never, "r2", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(200);
  });

  it("409s for a match still in poll (not scheduled/draft)", async () => {
    const r = repo({ async getMatchById() { return { ok: true, value: match("poll") }; } });
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r3", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(409);
  });

  it("409s for a match still finalizing", async () => {
    const r = repo({ async getMatchById() { return { ok: true, value: match("finalizing") }; } });
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r4", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(409);
  });

  it("409s for an already-played match", async () => {
    const r = repo({ async getMatchById() { return { ok: true, value: match("played") }; } });
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r5", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(409);
  });

  it("409s for a cancelled match", async () => {
    const r = repo({ async getMatchById() { return { ok: true, value: match("cancelled") }; } });
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r6", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(409);
  });

  it("requires a reason (missing)", async () => {
    const res = await handleSetDropout(putReq({}), allow() as never, "r7", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("requires a reason (empty after trim)", async () => {
    const res = await handleSetDropout(putReq({ reason: "   " }), allow() as never, "r8", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("rejects a reason over 120 characters", async () => {
    const res = await handleSetDropout(putReq({ reason: "x".repeat(121) }), allow() as never, "r9", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("reopens a previously-resolved dropout (reflects repo's reopened state)", async () => {
    const r = repo({
      async upsertDropout(_o: string, matchId: string, playerId: string, reason: string, now: Date) {
        // Simulates the repo's reopen semantics: re-dropping out clears resolvedAt.
        return { ok: true, value: dropout({ matchId, playerId, reason, createdAt: now, resolvedAt: null }) };
      },
    });
    const res = await handleSetDropout(putReq({ reason: "Injured again" }), allow() as never, "r10", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { dropout: { resolvedAt: string | null } } };
    expect(json.data.dropout.resolvedAt).toBeNull();
  });

  it("404s when the caller has not claimed a roster player", async () => {
    const r = repo({ async getPlayerBySubject() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r11", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });

  it("404s when the match does not exist", async () => {
    const r = repo({ async getMatchById() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleSetDropout(putReq({ reason: "Injured" }), allow() as never, "r12", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });

  it("denies (opaque 404) when the actor lacks dropout.set", async () => {
    const res = await handleSetDropout(putReq({ reason: "Injured" }), deny() as never, "r13", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(404);
  });

  it("422s invalid JSON", async () => {
    const req = new Request("https://x/matches/x/dropout", { method: "PUT", body: "{bad" });
    const res = await handleSetDropout(req, allow() as never, "r14", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(422);
  });
});

describe("handleUndoDropout", () => {
  it("undoes the caller's own unresolved dropout", async () => {
    const res = await handleUndoDropout(allow() as never, "r20", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(200);
  });

  it("404s once the dropout has been resolved (undo is unresolved-only)", async () => {
    const r = repo({ async deleteDropout() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleUndoDropout(allow() as never, "r21", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });

  it("404s when the caller has not claimed a roster player", async () => {
    const r = repo({ async getPlayerBySubject() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleUndoDropout(allow() as never, "r22", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });

  it("denies (opaque 404) when the actor lacks dropout.set", async () => {
    const res = await handleUndoDropout(deny() as never, "r23", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(404);
  });
});

describe("handleResolveDropout", () => {
  it("swaps the replacement into the dropped player's team_a slot via updateMatch", async () => {
    const res = await handleResolveDropout(
      resolveReq({ replacementPlayerId: playerPublicId(REPLACEMENT) }),
      allow() as never,
      "r30",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: repo() },
    );
    expect(res.status).toBe(200);
    expect(lastUpdateMatchInput).not.toBeNull();
    const teamA = lastUpdateMatchInput!.teamA!;
    const ids = teamA.players.map((p) => p.id);
    expect(ids).not.toContain(playerPublicId(DROPPED));
    expect(ids).toContain(playerPublicId(REPLACEMENT));
    const replacementEntry = teamA.players.find((p) => p.id === playerPublicId(REPLACEMENT))!;
    expect(replacementEntry.name).toBe("Fresh Legs");
    expect(replacementEntry.rating).toBe(80);
    // team_b is untouched (dropped player wasn't in it)
    expect(lastUpdateMatchInput!.teamB!.players.map((p) => p.id)).toEqual(["plr_other"]);
    const json = (await res.json()) as { data: { match: { id: string } | null } };
    expect(json.data.match).not.toBeNull();
    // The replacement note is a system message, not authored by a specific player.
    const note = lastChatInsert as { kind: string; authorPlayerId: string | null; authorName: string | null };
    expect(note.kind).toBe("note");
    expect(note.authorPlayerId).toBeNull();
    expect(note.authorName).toBeNull();
  });

  it("swaps into team_b when that's where the dropped player is (not hardcoded to team_a)", async () => {
    const r = repo({
      async getMatchById() {
        return {
          ok: true,
          value: match("scheduled", {
            teamA: { name: "Home", players: [{ id: "plr_other", name: "Other", position: "FWD", rating: 55 }], squadRating: 55 },
            teamB: {
              name: "Away",
              players: [{ id: playerPublicId(DROPPED), name: "Dropout Dan", position: "DEF", rating: 62 }],
              squadRating: 62,
            },
          }),
        };
      },
    });
    await handleResolveDropout(
      resolveReq({ replacementPlayerId: playerPublicId(REPLACEMENT) }),
      allow() as never,
      "r30b",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: r },
    );
    expect(lastUpdateMatchInput).not.toBeNull();
    expect(lastUpdateMatchInput!.teamA!.players.map((p) => p.id)).toEqual(["plr_other"]);
    const teamBIds = lastUpdateMatchInput!.teamB!.players.map((p) => p.id);
    expect(teamBIds).not.toContain(playerPublicId(DROPPED));
    expect(teamBIds).toContain(playerPublicId(REPLACEMENT));
  });

  it("still completes the swap when the dropped player's roster row is gone (falls back to a generic note)", async () => {
    const r = repo({
      async getPlayerById(_orgId: string, playerId: string) {
        if (playerId === REPLACEMENT) {
          return { ok: true, value: player({ id: REPLACEMENT, name: "Fresh Legs", position: "DEF", rating: 80 }) };
        }
        return { ok: false, error: { kind: "not_found" } };
      },
    });
    const res = await handleResolveDropout(
      resolveReq({ replacementPlayerId: playerPublicId(REPLACEMENT) }),
      allow() as never,
      "r30c",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: r },
    );
    expect(res.status).toBe(200);
    expect((lastChatInsert as { body: string }).body).toContain("Fresh Legs replaces Player in");
  });

  it("recomputes team_a's squadRating as the rounded average after the swap", async () => {
    await handleResolveDropout(
      resolveReq({ replacementPlayerId: playerPublicId(REPLACEMENT) }),
      allow() as never,
      "r31",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: repo() },
    );
    // team_a: [replacement@80, Steady Steve@70] -> avg 75
    expect(lastUpdateMatchInput!.teamA!.squadRating).toBe(75);
  });

  it("resolves without a replacement (no updateMatch call, match: null in response)", async () => {
    const res = await handleResolveDropout(resolveReq({}), allow() as never, "r32", MANAGER, ORG, MATCH, DROPPED, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastUpdateMatchInput).toBeNull();
    const json = (await res.json()) as { data: { match: unknown } };
    expect(json.data.match).toBeNull();
  });

  it("marks the dropout resolved", async () => {
    const res = await handleResolveDropout(resolveReq({}), allow() as never, "r33", MANAGER, ORG, MATCH, DROPPED, { repo: repo() });
    const json = (await res.json()) as { data: { dropout: { resolvedAt: string | null } } };
    expect(json.data.dropout.resolvedAt).not.toBeNull();
  });

  it("404s when the match does not exist and a replacement was given", async () => {
    const r = repo({ async getMatchById() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleResolveDropout(
      resolveReq({ replacementPlayerId: playerPublicId(REPLACEMENT) }),
      allow() as never,
      "r34",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: r },
    );
    expect(res.status).toBe(404);
  });

  it("422s (validation) when the replacement is not on the active roster", async () => {
    const r = repo({ async getPlayerById() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleResolveDropout(
      resolveReq({ replacementPlayerId: playerPublicId(REPLACEMENT) }),
      allow() as never,
      "r35",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: r },
    );
    expect(res.status).toBe(422);
  });

  it("422s a malformed replacementPlayerId", async () => {
    const res = await handleResolveDropout(
      resolveReq({ replacementPlayerId: "not-a-valid-id" }),
      allow() as never,
      "r36",
      MANAGER,
      ORG,
      MATCH,
      DROPPED,
      { repo: repo() },
    );
    expect(res.status).toBe(422);
  });

  it("422s a non-string replacementPlayerId", async () => {
    const res = await handleResolveDropout(resolveReq({ replacementPlayerId: 12 }), allow() as never, "r37", MANAGER, ORG, MATCH, DROPPED, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("404s when the dropout itself cannot be resolved (e.g. already resolved / unknown)", async () => {
    const r = repo({ async resolveDropout() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleResolveDropout(resolveReq({}), allow() as never, "r38", MANAGER, ORG, MATCH, DROPPED, { repo: r });
    expect(res.status).toBe(404);
  });

  it("denies (opaque 404) when the actor lacks poll.manage", async () => {
    const res = await handleResolveDropout(resolveReq({}), deny() as never, "r39", MANAGER, ORG, MATCH, DROPPED, { repo: repo() });
    expect(res.status).toBe(404);
  });

  it("422s invalid JSON body", async () => {
    const req = new Request("https://x/resolve", { method: "POST", body: "{bad" });
    const res = await handleResolveDropout(req, allow() as never, "r40", MANAGER, ORG, MATCH, DROPPED, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("accepts an empty body (no text) as no-replacement", async () => {
    const req = new Request("https://x/resolve", { method: "POST" });
    const res = await handleResolveDropout(req, allow() as never, "r41", MANAGER, ORG, MATCH, DROPPED, { repo: repo() });
    expect(res.status).toBe(200);
  });
});
