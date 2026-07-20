// Drives handleSetPollVotes through the REAL repository (createMatchmakerRepository)
// backed by a recording fake SqlExecutor, for the reported bug: a freshly-created
// player (subjectId set) submitting availability on a poll with two options (one
// time, one turf) whose wire ids are opaque `opt_` ids. This exercises the actual
// setPollVotes SQL-building/param-binding — the layer that was collapsing a write
// failure into a blanket 503 — and asserts a 200, not a 503.
import { handleSetPollVotes } from "@matchmaker-worker/handlers/match-polls";
import { pollOptionPublicId } from "@matchmaker-worker/ids";
import type { SqlExecutor, SqlExecutorResult, SqlRow } from "@saas/db/hyperdrive";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import {
  ACTOR,
  MATCH,
  ORG,
  PLAYER,
  TIME_OPT,
  TURF_OPT,
  allowEnv,
  jsonReq,
  pollDetail,
  repo,
  timeOption,
  turfOption,
} from "./match-polls-fixtures.js";

interface RecordedCall {
  text: string;
  params: unknown[];
}

/** A fake SqlExecutor that records every statement and answers the option-id
 *  existence check with a row per requested id (so validation passes), and
 *  every write with an empty result — no real Postgres, but the real repo's
 *  SQL/param-binding runs against it. */
function recordingExecutor(): { executor: SqlExecutor; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const executor: SqlExecutor = {
    async execute<T extends SqlRow = SqlRow>(text: string, params: unknown[] = []): Promise<SqlExecutorResult<T>> {
      calls.push({ text, params });
      if (text.includes("SELECT id FROM matchmaker.match_poll_options")) {
        // params: [orgId, matchId, uniqueIds] — echo one row per requested id.
        const ids = (params[2] as string[]) ?? [];
        return { rows: ids.map((id) => ({ id })) as unknown as T[], rowCount: ids.length };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return { executor, calls };
}

describe("handleSetPollVotes — real setPollVotes SQL (freshly-created player, time+turf)", () => {
  it("returns 200 (not 503) and issues casted scalar-param writes without unnest/array binding", async () => {
    const { executor, calls } = recordingExecutor();
    const realRepo = createMatchmakerRepository(executor);

    // Fixture repo for the surrounding reads; the real repo supplies the one
    // method under test so its SQL actually runs.
    const r = repo({
      // Freshly-created player: has a subject id, id is a canonical uuid.
      async getPlayerBySubject() {
        return { ok: true, value: { id: PLAYER, subjectId: ACTOR.subjectId, name: "Sam" } as never };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({}, [timeOption({ voterPlayerIds: [] }), turfOption({ voterPlayerIds: [] })]) };
      },
      setPollVotes: realRepo.setPollVotes,
    });

    const res = await handleSetPollVotes(
      jsonReq("PUT", { optionIds: [pollOptionPublicId(TIME_OPT), pollOptionPublicId(TURF_OPT)] }),
      allowEnv() as never,
      "rr1",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );

    expect(res.status).toBe(200);

    // The real setPollVotes ran: an option-id check, a DELETE, and an INSERT.
    const check = calls.find((c) => c.text.includes("SELECT id FROM matchmaker.match_poll_options"));
    const del = calls.find((c) => c.text.startsWith("DELETE FROM matchmaker.match_poll_votes") || c.text.includes("DELETE FROM matchmaker.match_poll_votes"));
    const ins = calls.find((c) => c.text.includes("INSERT INTO matchmaker.match_poll_votes"));
    expect(check).toBeDefined();
    expect(del).toBeDefined();
    expect(ins).toBeDefined();

    // The write no longer relies on driver array-type inference: no unnest / no
    // `uuid[]` array param, and every id is bound as its own casted scalar.
    expect(ins!.text).not.toContain("unnest");
    expect(ins!.text).toContain("::uuid");
    expect(ins!.text).toContain("::timestamptz");
    expect(del!.text).not.toContain("!= ALL");
    expect(del!.text).toContain("NOT IN");
    // INSERT params: [orgId, matchId, playerId, TIME_OPT, TURF_OPT, iso].
    expect(ins!.params).toEqual([ORG, MATCH, PLAYER, TIME_OPT, TURF_OPT, expect.any(String)]);
  });

  it("surfaces a diagnosable internal error (not a blank one) when the write throws", async () => {
    const executor: SqlExecutor = {
      async execute<T extends SqlRow = SqlRow>(text: string): Promise<SqlExecutorResult<T>> {
        if (text.includes("SELECT id FROM matchmaker.match_poll_options")) {
          return { rows: [{ id: TIME_OPT }] as unknown as T[], rowCount: 1 };
        }
        throw Object.assign(new Error('column "option_id" is of type uuid but expression is of type text'), { code: "42804" });
      },
    };
    const realRepo = createMatchmakerRepository(executor);
    const result = await realRepo.setPollVotes(ORG, MATCH, PLAYER, [TIME_OPT], new Date());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("internal");
      // The preserved pg message + SQLSTATE make the swallowed failure diagnosable.
      expect(result.error.kind === "internal" && result.error.message).toContain("is of type uuid");
      expect(result.error.kind === "internal" && result.error.message).toContain("42804");
    }
  });
});
