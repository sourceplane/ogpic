// closeDueRatingRounds (apps/matchmaker-worker/src/scheduled.ts) is the
// injectable core wired into `scheduled()` alongside closeDuePolls — mirrors
// that factoring exactly: the testable core takes (env, repo, now), and
// `runAutoCloseRatingRounds` is the thin PLATFORM_DB wrapper around it (see
// match-polls-cron.test.ts for the poll analogue). This suite drives the core
// directly with a stub repo instead of a real DB.
import { closeDueRatingRounds } from "@matchmaker-worker/scheduled";
import { asUuid } from "@saas/db/ids";
import type {
  InsertChatMessageInput,
  InsertRatingRoundResultInput,
  MatchmakerRepository,
  Player,
  PlayerVoteStats,
  RatingRound,
} from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER_A = asUuid("11111111-1111-1111-1111-111111111111");
const ROUND = asUuid("99999999-9999-9999-9999-999999999999");

function duePlayer(overrides: Partial<Player> = {}): Player {
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

function dueRound(overrides: Partial<RatingRound> = {}): RatingRound {
  return {
    id: ROUND,
    orgId: ORG,
    status: "open",
    openedBy: "usr_m",
    openedAt: new Date("2026-07-19T00:00:00.000Z"),
    closedAt: null,
    deadlineKind: "24h",
    deadlineAt: new Date("2026-07-19T00:00:00.000Z"), // in the past relative to "now"
    ...overrides,
  };
}

describe("closeDueRatingRounds", () => {
  it("closes every due round: closed_at stamped, settled results written, and a chat note posted", async () => {
    const closeCalls: string[] = [];
    const insertedRows: InsertRatingRoundResultInput[] = [];
    const notes: InsertChatMessageInput[] = [];
    const voteStats: PlayerVoteStats[] = [{ playerId: PLAYER_A, voterCount: 4, avgStars: 4 }];
    const repo: Partial<MatchmakerRepository> = {
      async listDueRatingRounds() {
        return { ok: true, value: [dueRound()] };
      },
      async closeRatingRound(orgId: string) {
        closeCalls.push(orgId);
        return { ok: true, value: dueRound({ status: "closed", closedAt: new Date() }) };
      },
      async listActivePlayers() {
        return { ok: true, value: [duePlayer()] };
      },
      async listPlayerVoteStats() {
        return { ok: true, value: voteStats };
      },
      async insertRatingRoundResults(rows: InsertRatingRoundResultInput[]) {
        insertedRows.push(...rows);
        return { ok: true, value: undefined };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        notes.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    };

    await closeDueRatingRounds({} as never, repo as MatchmakerRepository, new Date());

    expect(closeCalls).toEqual([ORG]);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]!.votesReceived).toBe(4);
    expect(insertedRows[0]!.ovrAfter).toBeGreaterThan(insertedRows[0]!.ovrBefore);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.kind).toBe("note");
    expect(notes[0]!.body).toContain("closed");
  });

  it("leaves non-due rounds untouched (listDueRatingRounds returning none closes nothing)", async () => {
    const closeCalls: unknown[] = [];
    const repo: Partial<MatchmakerRepository> = {
      async listDueRatingRounds() {
        return { ok: true, value: [] };
      },
      async closeRatingRound() {
        closeCalls.push(1);
        return { ok: true, value: dueRound({ status: "closed", closedAt: new Date() }) };
      },
    };

    await closeDueRatingRounds({} as never, repo as MatchmakerRepository, new Date());
    expect(closeCalls).toHaveLength(0);
  });

  it("skips a round whose close fails (e.g. already closed manually) without throwing or settling it", async () => {
    const insertedRows: unknown[] = [];
    const repo: Partial<MatchmakerRepository> = {
      async listDueRatingRounds() {
        return { ok: true, value: [dueRound()] };
      },
      async closeRatingRound() {
        return { ok: false, error: { kind: "not_found" } };
      },
      async insertRatingRoundResults(rows: unknown[]) {
        insertedRows.push(...rows);
        return { ok: true, value: undefined };
      },
    };

    await expect(closeDueRatingRounds({} as never, repo as MatchmakerRepository, new Date())).resolves.toBeUndefined();
    expect(insertedRows).toHaveLength(0);
  });
});
