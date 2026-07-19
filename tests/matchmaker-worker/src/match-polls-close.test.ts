import { handleClosePoll } from "@matchmaker-worker/handlers/match-polls";
import type { InsertChatMessageInput, UpdateMatchInput } from "@saas/db/matchmaker";
import { ACTOR, MATCH, ORG, allowEnv, denyEnv, match, repo } from "./match-polls-fixtures.js";

describe("handleClosePoll", () => {
  it("moves the match to finalizing, stamps closed_at, and posts a chat note", async () => {
    const notes: InsertChatMessageInput[] = [];
    const updates: UpdateMatchInput[] = [];
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "poll" }) };
      },
      async updateMatch(_o: string, _m: string, input: UpdateMatchInput) {
        updates.push(input);
        return { ok: true, value: { ...match({ status: "poll" }), status: "finalizing", updatedAt: input.updatedAt } };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleClosePoll(allowEnv() as never, "r1", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { match: { status: string } } };
    expect(json.data.match.status).toBe("finalizing");
    expect(updates).toHaveLength(1);
    expect(updates[0]!.status).toBe("finalizing");
    expect(notes).toHaveLength(1);
    expect(notes[0]!.kind).toBe("note");
    expect(notes[0]!.body).toContain("Poll closed");
  });

  it("409s when the match status is not 'poll' (already finalizing/draft/etc.)", async () => {
    let closeCalled = false;
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "finalizing" }) };
      },
      async closeMatchPoll() {
        closeCalled = true;
        return {
          ok: true,
          value: { matchId: MATCH, orgId: ORG, deadlineKind: "24h", deadlineAt: null, closedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
        };
      },
    });
    const res = await handleClosePoll(allowEnv() as never, "r2", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(409);
    // The match-status guard must short-circuit before ever touching the poll row.
    expect(closeCalled).toBe(false);
  });

  it("409s (double close) when the repo reports the poll row is already closed", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "poll" }) };
      },
      async closeMatchPoll() {
        return { ok: false, error: { kind: "conflict", entity: "match_poll" } };
      },
    });
    const res = await handleClosePoll(allowEnv() as never, "r3", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(409);
  });

  it("404s when the match does not exist", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: false, error: { kind: "not_found" } };
      },
    });
    const res = await handleClosePoll(allowEnv() as never, "r4", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });

  it("404s (opaque) when policy denies organization.poll.manage", async () => {
    const res = await handleClosePoll(denyEnv() as never, "r5", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(404);
  });
});
