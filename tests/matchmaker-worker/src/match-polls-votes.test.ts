import { handleSetPollVotes } from "@matchmaker-worker/handlers/match-polls";
import { playerPublicId } from "@matchmaker-worker/ids";
import type { InsertChatMessageInput } from "@saas/db/matchmaker";
import {
  ACTOR,
  MATCH,
  ORG,
  PLAYER,
  PLAYER_2,
  TIME_OPT,
  allowEnv,
  denyEnv,
  envAllowingOnly,
  jsonReq,
  pollDetail,
  repo,
  timeOption,
  turfOption,
} from "./match-polls-fixtures.js";

describe("handleSetPollVotes — self-service", () => {
  it("lets the subject-claimed player vote for themself", async () => {
    const r = repo({
      async getPlayerBySubject() {
        return { ok: true, value: { id: PLAYER, subjectId: ACTOR.subjectId, name: "Sam" } as never };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [PLAYER] }), turfOption()]) };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      allowEnv() as never,
      "r1",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { options: { kind: string; votes: number }[] } };
    expect(json.data.options.find((o) => o.kind === "time")!.votes).toBe(1);
  });

  it("replaces the player's ballot rather than appending to it: setPollVotes is called with exactly the new ids", async () => {
    let captured: string[] | null = null;
    const r = repo({
      // Player previously voted for the turf option only.
      async getMatchPoll() {
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [] }), turfOption({ voterPlayerIds: [PLAYER] })]) };
      },
      async setPollVotes(_o: string, _m: string, _p: string, optionIds: string[]) {
        captured = optionIds;
        return { ok: true, value: undefined };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      allowEnv() as never,
      "r2",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
    // Not [TIME_OPT, TURF_OPT] — the handler must hand the repo the caller's
    // full replacement ballot, never merge it with the prior one.
    expect(captured).toEqual([TIME_OPT]);
  });

  it("inserts exactly one first-vote chat note, not on every subsequent vote", async () => {
    const notes: InsertChatMessageInput[] = [];
    let call = 0;
    const r = repo({
      async getMatchPoll() {
        call++;
        // 1st call ("before"): no votes yet. 2nd call ("after"): player voted time.
        if (call === 1) return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [] }), turfOption()]) };
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [PLAYER] }), turfOption()]) };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      allowEnv() as never,
      "r3",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.kind).toBe("note");
    expect(notes[0]!.body).toContain("voted");
  });

  it("does not insert a note when the player had already voted before this call", async () => {
    const notes: unknown[] = [];
    const r = repo({
      // Both "before" and "after" show the player already having a vote.
      async getMatchPoll() {
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [PLAYER] }), turfOption()]) };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      allowEnv() as never,
      "r4",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
    expect(notes).toHaveLength(0);
  });

  it("does not insert a note when the ballot is cleared to empty (no positive first vote)", async () => {
    const notes: unknown[] = [];
    const r = repo({
      async getMatchPoll() {
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [] }), turfOption()]) };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleSetPollVotes(jsonReq("PUT", { optionIds: [] }), allowEnv() as never, "r5", ACTOR, ORG, MATCH, {
      repo: r,
    });
    expect(res.status).toBe(200);
    expect(notes).toHaveLength(0);
  });

  it("422s when optionIds is missing / not an array of strings", async () => {
    const res = await handleSetPollVotes(jsonReq("PUT", { optionIds: "nope" }), allowEnv() as never, "r6", ACTOR, ORG, MATCH, {
      repo: repo(),
    });
    expect(res.status).toBe(422);
  });

  it("422s (validation) when the repo rejects option ids foreign to this poll", async () => {
    const r = repo({
      async setPollVotes() {
        return { ok: false, error: { kind: "validation", message: "One or more option ids do not belong to this match's poll" } };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: ["not-in-poll"] }),
      allowEnv() as never,
      "r7",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { details: { fields: Record<string, string[]> } } };
    expect(json.error.details.fields.optionIds).toBeDefined();
  });

  it("409s when the poll is already closed", async () => {
    let setCalled = false;
    const r = repo({
      async getMatchPoll() {
        return { ok: true, value: pollDetail({ closedAt: new Date() }) };
      },
      async setPollVotes() {
        setCalled = true;
        return { ok: true, value: undefined };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      allowEnv() as never,
      "r8",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(409);
    expect(setCalled).toBe(false);
  });

  it("404s (opaque) when the caller has no claimed player and votes for themself", async () => {
    const r = repo({
      async getPlayerBySubject() {
        return { ok: false, error: { kind: "not_found" } };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      allowEnv() as never,
      "r9",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(404);
  });

  it("404s (opaque) when policy denies organization.poll.vote", async () => {
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT] }),
      denyEnv() as never,
      "r10",
      ACTOR,
      ORG,
      MATCH,
      { repo: repo() },
    );
    expect(res.status).toBe(404);
  });
});

describe("handleSetPollVotes — manager voting on behalf of a roster player", () => {
  function reqBody() {
    return { optionIds: [TIME_OPT], playerId: playerPublicId(PLAYER_2) };
  }

  it("requires organization.poll.manage, not organization.poll.vote, when playerId is supplied", async () => {
    // Only the vote action is allowed — the manage-only path must still 404.
    const res = await handleSetPollVotes(
      jsonReq("PUT", reqBody()),
      envAllowingOnly("organization.poll.vote") as never,
      "r11",
      ACTOR,
      ORG,
      MATCH,
      { repo: repo() },
    );
    expect(res.status).toBe(404);
  });

  it("succeeds once organization.poll.manage is granted", async () => {
    const r = repo({
      async getPlayerById() {
        return { ok: true, value: { id: PLAYER_2, name: "Other Player" } as never };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [] }), turfOption()]) };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", reqBody()),
      envAllowingOnly("organization.poll.manage") as never,
      "r12",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
  });

  it("posts the first-vote note with the voted-for player as author, not the acting manager", async () => {
    const notes: InsertChatMessageInput[] = [];
    let call = 0;
    const r = repo({
      async getPlayerById() {
        return { ok: true, value: { id: PLAYER_2, name: "Other Player" } as never };
      },
      async getMatchPoll() {
        call++;
        if (call === 1) return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [] }), turfOption()]) };
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [PLAYER_2] }), turfOption()]) };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleSetPollVotes(
      jsonReq("PUT", reqBody()),
      envAllowingOnly("organization.poll.manage") as never,
      "r13",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.authorPlayerId).toBe(PLAYER_2);
    expect(notes[0]!.authorSubjectId).toBeNull();
  });

  it("422s on a malformed playerId", async () => {
    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [TIME_OPT], playerId: "not-a-player-id" }),
      allowEnv() as never,
      "r14",
      ACTOR,
      ORG,
      MATCH,
      { repo: repo() },
    );
    expect(res.status).toBe(422);
  });

  it("404s when the manager targets a player that does not exist on the roster", async () => {
    const r = repo({
      async getPlayerById() {
        return { ok: false, error: { kind: "not_found" } };
      },
    });
    const res = await handleSetPollVotes(jsonReq("PUT", reqBody()), allowEnv() as never, "r15", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });
});
