import { createMatchmakerRepository } from "@saas/db/matchmaker";
import type { SqlExecutor, SqlExecutorResult, SqlRow } from "@saas/db/hyperdrive";

type QueryRecord = { text: string; params: unknown[] };

function fakeExecutor(rowCount: number, error?: unknown): { executor: SqlExecutor; queries: QueryRecord[] } {
  const queries: QueryRecord[] = [];
  const executor: SqlExecutor = {
    async execute<T extends SqlRow = SqlRow>(text: string, params?: unknown[]): Promise<SqlExecutorResult<T>> {
      queries.push({ text, params: params ?? [] });
      if (error) throw error;
      return { rows: [] as unknown as T[], rowCount };
    },
  };
  return { executor, queries };
}

const NOW = new Date("2026-07-14T20:00:00.000Z");

describe("matchmaker repository — startDueMatches (auto-start cron)", () => {
  it("flips due scheduled matches to 'live' and returns the count", async () => {
    const { executor, queries } = fakeExecutor(3);
    const repo = createMatchmakerRepository(executor);

    const result = await repo.startDueMatches(NOW);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(3);

    expect(queries).toHaveLength(1);
    const q = queries[0]!;
    expect(q.text).toContain("UPDATE matchmaker.matches");
    expect(q.text).toContain("status = 'live'");
    expect(q.text).toContain("status = 'scheduled'");
    expect(q.text).toContain("scheduled_at <= $1");
    expect(q.params).toEqual([NOW.toISOString()]);
  });

  it("returns 0 when nothing is due", async () => {
    const { executor } = fakeExecutor(0);
    const repo = createMatchmakerRepository(executor);
    const result = await repo.startDueMatches(NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(0);
  });

  it("fails closed on a DB error instead of throwing", async () => {
    const { executor } = fakeExecutor(0, new Error("boom"));
    const repo = createMatchmakerRepository(executor);
    const result = await repo.startDueMatches(NOW);
    expect(result.ok).toBe(false);
  });
});
