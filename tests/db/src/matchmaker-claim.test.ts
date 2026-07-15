import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { asUuid } from "@saas/db/ids";
import type { SqlExecutor, SqlExecutorResult, SqlRow } from "@saas/db/hyperdrive";

type QueryRecord = { text: string; params: unknown[] };

function fakeExecutor(result: { rows?: Record<string, unknown>[]; rowCount?: number; error?: unknown }): {
  executor: SqlExecutor;
  queries: QueryRecord[];
} {
  const queries: QueryRecord[] = [];
  const executor: SqlExecutor = {
    async execute<T extends SqlRow = SqlRow>(text: string, params?: unknown[]): Promise<SqlExecutorResult<T>> {
      queries.push({ text, params: params ?? [] });
      if (result.error) throw result.error;
      const rows = (result.rows ?? []) as unknown as T[];
      return { rows, rowCount: result.rowCount ?? rows.length };
    },
  };
  return { executor, queries };
}

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const NOW = new Date("2026-07-14T20:00:00.000Z");

const ROW = {
  id: PLAYER,
  org_id: ORG,
  name: "Sam",
  position: "MID",
  rating: 60,
  attributes: {},
  email: "sam@example.com",
  phone: null,
  status: "active",
  is_captain: false,
  subject_id: "usr_1",
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
  archived_at: null,
};

describe("matchmaker repository — claimPlayer / getPlayerBySubject", () => {
  it("claims only an active, unclaimed player and returns it", async () => {
    const { executor, queries } = fakeExecutor({ rows: [ROW], rowCount: 1 });
    const repo = createMatchmakerRepository(executor);
    const res = await repo.claimPlayer(ORG, PLAYER, "usr_1", NOW);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.subjectId).toBe("usr_1");
    const q = queries[0]!;
    expect(q.text).toContain("UPDATE matchmaker.players");
    expect(q.text).toContain("subject_id IS NULL");
    expect(q.text).toContain("status = 'active'");
    expect(q.params).toEqual([ORG, PLAYER, "usr_1", NOW.toISOString()]);
  });

  it("conflicts when no row is updated (already claimed / missing)", async () => {
    const { executor } = fakeExecutor({ rows: [], rowCount: 0 });
    const repo = createMatchmakerRepository(executor);
    const res = await repo.claimPlayer(ORG, PLAYER, "usr_1", NOW);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe("conflict");
  });

  it("looks up the caller's claimed player by subject", async () => {
    const { executor, queries } = fakeExecutor({ rows: [ROW], rowCount: 1 });
    const repo = createMatchmakerRepository(executor);
    const res = await repo.getPlayerBySubject(ORG, "usr_1");
    expect(res.ok).toBe(true);
    expect(queries[0]!.text).toContain("subject_id = $2");
    expect(queries[0]!.params).toEqual([ORG, "usr_1"]);
  });

  it("returns not_found when the subject has claimed nobody", async () => {
    const { executor } = fakeExecutor({ rows: [], rowCount: 0 });
    const repo = createMatchmakerRepository(executor);
    const res = await repo.getPlayerBySubject(ORG, "usr_1");
    expect(res.ok).toBe(false);
  });
});

describe("matchmaker repository — listScheduledMatchesInWindow (reminder cron)", () => {
  it("queries scheduled fixtures within the [from, to] window", async () => {
    const from = new Date("2026-07-14T20:00:00.000Z");
    const to = new Date("2026-07-15T20:00:00.000Z");
    const { executor, queries } = fakeExecutor({ rows: [], rowCount: 0 });
    const repo = createMatchmakerRepository(executor);
    const res = await repo.listScheduledMatchesInWindow(from, to);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toEqual([]);
    const q = queries[0]!;
    expect(q.text).toContain("status = 'scheduled'");
    expect(q.text).toContain("scheduled_at >= $1");
    expect(q.text).toContain("scheduled_at <= $2");
    expect(q.params).toEqual([from.toISOString(), to.toISOString()]);
  });
});
