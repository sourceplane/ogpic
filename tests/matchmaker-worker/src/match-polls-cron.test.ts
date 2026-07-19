// runAutoClosePolls (apps/matchmaker-worker/src/scheduled.ts) has no injected
// repo the way every HTTP handler does (no `deps?.repo` escape hatch) — it
// always builds its own repo from the real `createSqlExecutor` /
// `createMatchmakerRepository`. Unlike its sibling cron pass in the same
// file, `runAvailabilityReminders`, which factors its logic into an
// injectable core (`sendAvailabilityRemindersFor(env, repo, enqueue,
// matches)` — see reminders.test.ts), `runAutoClosePolls` has no such seam.
//
// We tried covering it anyway via Jest's ESM module-mocking primitives
// (`jest.doMock`/`jest.unstable_mockModule` + dynamic `import()` of
// "@matchmaker-worker/scheduled", swapping in fakes for "@saas/db/hyperdrive"
// and "@saas/db/matchmaker"). It is NOT reliable in this repo's exact Jest 29
// + ts-jest ESM + `--experimental-vm-modules` configuration:
//   - `jest.resetModules()` does not evict previously dynamic-imported ESM
//     modules from the VM's SourceTextModule cache, so once any other test
//     file in the same worker has done a real (unmocked) static import of
//     "@saas/db/hyperdrive"/"@saas/db/matchmaker" (every handler test file
//     does, transitively, via `@matchmaker-worker/handlers/*`), later mocks
//     for those exact specifiers silently do not apply — confirmed by
//     reproducing a deterministic failure under `--runInBand` and under
//     repeated `pnpm exec turbo run test --filter=@saas/matchmaker-worker-tests`
//     runs in this sandbox (both serialize enough test files into shared
//     workers to hit the collision every time), while plain parallel
//     `pnpm exec jest` (one OS process per test file) happened to pass by
//     virtue of true process isolation — not a guarantee.
//   - `jest.isolateModulesAsync` (the documented fix for exactly this class
//     of problem) instead throws a Jest-internal error on the second call in
//     this file/version combination: "Module cache already has entry
//     .../postgres/src/index.js. This is a bug in Jest, please report it!"
//     — i.e. Jest's own message identifies this as a Jest bug, not a
//     fixable test-authoring issue.
//
// Rather than ship a suite that passes or fails depending on Jest's worker
// scheduling (which is exactly what turbo's canonical `pnpm exec turbo run
// test --filter=@saas/matchmaker-worker-tests` hit here — deterministic
// failures, not flakes), the contract is documented below as `.skip`. See
// bugsFound for the recommended fix (extract an injectable core, mirroring
// `sendAvailabilityRemindersFor`) which would make this trivially testable
// the same way every other handler in this suite is.
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

describe.skip("runAutoClosePolls (documents the intended contract — see file header for why this cannot run reliably against the current, non-injectable scheduled.ts)", () => {
  // Would-be `deps`-style entry point this suite assumes exists, e.g.:
  //   export async function closeDuePolls(repo: MatchmakerRepository, now: Date): Promise<void>
  // extracted out of runAutoClosePolls the same way sendAvailabilityRemindersFor
  // was extracted out of runAvailabilityReminders.
  const closeDuePolls: (repo: MatchmakerRepository, now: Date) => Promise<void> = async () => {
    throw new Error("closeDuePolls does not exist yet — see file header for the recommended extraction.");
  };

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

    await closeDuePolls(repo as MatchmakerRepository, new Date());

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

    await closeDuePolls(repo as MatchmakerRepository, new Date());
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

    await expect(closeDuePolls(repo as MatchmakerRepository, new Date())).resolves.toBeUndefined();
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

    await expect(closeDuePolls(repo as MatchmakerRepository, new Date())).resolves.toBeUndefined();
    // Only the second (successful) poll gets a note; the first's update failure
    // doesn't stop the batch or throw.
    expect(notes).toHaveLength(1);
  });
});
