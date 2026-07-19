// closeDuePolls (apps/matchmaker-worker/src/scheduled.ts) is the injectable
// core extracted out of runAutoClosePolls, mirroring how
// sendAvailabilityRemindersFor is factored out of runAvailabilityReminders
// (see reminders.test.ts). runAutoClosePolls itself stays a thin env wrapper
// that builds the real repo from PLATFORM_DB and delegates here — this suite
// drives the core directly with a stub repo instead.
import { closeDuePolls } from "@matchmaker-worker/scheduled";
import type { InsertChatMessageInput, MatchmakerRepository, MatchPoll, UpdateMatchInput } from "@saas/db/matchmaker";
import { applyUpdateMatch, match as buildMatch, ORG, MATCH } from "./match-polls-fixtures.js";

function duePoll(overrides: Partial<MatchPoll> = {}): MatchPoll {
  return {
    matchId: MATCH,
    orgId: ORG,
    deadlineKind: "24h",
    deadlineAt: new Date("2026-07-18T00:00:00.000Z"), // in the past relative to "now"
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("closeDuePolls", () => {
  it("closes every due poll: match -> finalizing, closed_at stamped, and a chat note posted", async () => {
    const closeCalls: { orgId: string; matchId: string }[] = [];
    const updateCalls: UpdateMatchInput[] = [];
    const notes: InsertChatMessageInput[] = [];
    const repo: Partial<MatchmakerRepository> = {
      async listDuePolls() {
        return { ok: true, value: [duePoll()] };
      },
      async closeMatchPoll(orgId: string, matchId: string) {
        closeCalls.push({ orgId, matchId });
        return { ok: true, value: duePoll({ closedAt: new Date() }) };
      },
      async getMatchById() {
        return { ok: true, value: buildMatch({ status: "poll" }) };
      },
      async updateMatch(_o: string, _m: string, input: UpdateMatchInput) {
        updateCalls.push(input);
        return { ok: true, value: applyUpdateMatch(buildMatch({ status: "poll" }), input) };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    };

    await closeDuePolls({} as never, repo as MatchmakerRepository, new Date());

    expect(closeCalls).toHaveLength(1);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]!.status).toBe("finalizing");
    expect(notes).toHaveLength(1);
    expect(notes[0]!.kind).toBe("note");
    expect(notes[0]!.body).toContain("Poll closed");
  });

  it("leaves non-due polls untouched (listDuePolls returning none closes nothing)", async () => {
    const closeCalls: unknown[] = [];
    const repo: Partial<MatchmakerRepository> = {
      async listDuePolls() {
        return { ok: true, value: [] };
      },
      async closeMatchPoll() {
        closeCalls.push(1);
        return { ok: true, value: duePoll({ closedAt: new Date() }) };
      },
    };

    await closeDuePolls({} as never, repo as MatchmakerRepository, new Date());
    expect(closeCalls).toHaveLength(0);
  });

  it("skips a poll whose close fails (e.g. concurrently closed) without throwing or touching the match", async () => {
    const updateCalls: unknown[] = [];
    const repo: Partial<MatchmakerRepository> = {
      async listDuePolls() {
        return { ok: true, value: [duePoll()] };
      },
      async closeMatchPoll() {
        return { ok: false, error: { kind: "conflict", entity: "match_poll" } };
      },
      async updateMatch(_o: string, _m: string, input: UpdateMatchInput) {
        updateCalls.push(input);
        return { ok: true, value: applyUpdateMatch(buildMatch(), input) };
      },
    };

    await expect(closeDuePolls({} as never, repo as MatchmakerRepository, new Date())).resolves.toBeUndefined();
    expect(updateCalls).toHaveLength(0);
  });

  it("processes remaining due polls even when one entry's updateMatch fails", async () => {
    const matchA = MATCH;
    const matchB = "44444444-4444-4444-4444-444444444444";
    const notes: unknown[] = [];
    const repo: Partial<MatchmakerRepository> = {
      async listDuePolls() {
        return { ok: true, value: [duePoll({ matchId: matchA }), duePoll({ matchId: matchB })] };
      },
      async closeMatchPoll() {
        return { ok: true, value: duePoll({ closedAt: new Date() }) };
      },
      async getMatchById() {
        return { ok: true, value: buildMatch() };
      },
      async updateMatch(_o: string, matchId: string, input: UpdateMatchInput) {
        if (matchId === matchA) return { ok: false, error: { kind: "internal", message: "boom" } };
        return { ok: true, value: applyUpdateMatch(buildMatch(), input) };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    };

    await expect(closeDuePolls({} as never, repo as MatchmakerRepository, new Date())).resolves.toBeUndefined();
    // Only the second (successful) poll gets a note; the first's update failure
    // doesn't stop the batch or throw.
    expect(notes).toHaveLength(1);
  });
});
