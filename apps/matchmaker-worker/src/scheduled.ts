import type { Env } from "./env.js";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMatchmakerRepository } from "@saas/db/matchmaker";

/**
 * Auto-start pass (cron): flip every scheduled fixture whose kickoff time has
 * arrived to 'live', across all orgs. Idempotent and bounded — a single UPDATE.
 * Fails closed when `PLATFORM_DB` is missing; never throws (a throw would retry
 * the whole cron invocation).
 */
export async function runAutoStartDueMatches(env: Env): Promise<void> {
  if (!env.PLATFORM_DB) {
    console.error("[scheduled] PLATFORM_DB binding missing");
    return;
  }
  const executor = createSqlExecutor(env.PLATFORM_DB);
  try {
    const repo = createMatchmakerRepository(executor);
    const result = await repo.startDueMatches(new Date());
    if (!result.ok) {
      console.error(`[scheduled] auto-start failed: ${result.error.kind}`);
      return;
    }
    if (result.value > 0) {
      console.warn(`[scheduled] auto-started ${result.value} due match(es)`);
    }
  } finally {
    await executor.dispose();
  }
}
