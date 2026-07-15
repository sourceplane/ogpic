import type { Env } from "./env.js";
import type { Match, MatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { asUuid } from "@saas/db/ids";
import { enqueueNotification, buildIdempotencyKey } from "@saas/notifications-client";
import { matchPublicId } from "./ids.js";

/** How far ahead of kickoff a scheduled fixture becomes eligible for reminders. */
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Auto-start pass (cron): flip every scheduled fixture whose kickoff time has
 * arrived to 'live', across all orgs. Idempotent and bounded — a single UPDATE.
 * Fails closed when `PLATFORM_DB` is missing; never throws.
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

type EnqueueFn = typeof enqueueNotification;

/**
 * Reminder core (testable): for each upcoming scheduled match, nudge every
 * active player who has NOT confirmed "in" (over email and/or WhatsApp). Per
 * (match, player, channel) idempotent so repeated cron ticks collapse to one
 * reminder. Returns the number of enqueue calls made.
 */
export async function sendAvailabilityRemindersFor(
  env: Env,
  repo: MatchmakerRepository,
  enqueue: EnqueueFn,
  matches: Match[],
): Promise<number> {
  let sent = 0;
  for (const match of matches) {
    const orgId = asUuid(match.orgId);
    const roster = await repo.listActivePlayers(orgId);
    const avail = await repo.listAvailability(orgId);
    if (!roster.ok || !avail.ok) continue;
    const confirmed = new Set(avail.value.filter((a) => a.state === "in").map((a) => a.playerId));
    const publicMatchId = matchPublicId(match.id);
    const ctx = {
      internalActor: "matchmaker-worker",
      actorSubjectType: "service_principal",
      actorSubjectId: "system",
      requestId: `reminder-${publicMatchId}`,
    };
    const templateData = {
      scheduledAt: match.scheduledAt.toISOString(),
      venue: match.venue.name ?? "",
      matchId: publicMatchId,
    };
    const send = (channel: "email" | "whatsapp", address: string, playerId: string) => {
      sent++;
      return enqueue(env, ctx, {
        orgId: match.orgId,
        category: "product",
        templateKey: "match.availability_request",
        templateData,
        recipient: { channel, address },
        idempotencyKey: buildIdempotencyKey("match.availability_reminder", publicMatchId, channel, playerId),
        correlationId: ctx.requestId,
      });
    };
    for (const player of roster.value) {
      if (confirmed.has(player.id)) continue;
      if (player.email) await send("email", player.email, player.id);
      if (player.phone) await send("whatsapp", player.phone, player.id);
    }
  }
  return sent;
}

/**
 * Reminder pass (cron): send availability reminders for scheduled fixtures
 * kicking off within the next window. Skipped under DEBUG_DELIVERY; never throws.
 */
export async function runAvailabilityReminders(env: Env): Promise<void> {
  if (env.DEBUG_DELIVERY === "true") return;
  if (!env.PLATFORM_DB) return;
  const executor = createSqlExecutor(env.PLATFORM_DB);
  try {
    const repo = createMatchmakerRepository(executor);
    const now = new Date();
    const to = new Date(now.getTime() + REMINDER_WINDOW_MS);
    const matches = await repo.listScheduledMatchesInWindow(now, to);
    if (!matches.ok) {
      console.error(`[scheduled] reminder window query failed: ${matches.error.kind}`);
      return;
    }
    const sent = await sendAvailabilityRemindersFor(env, repo, enqueueNotification, matches.value);
    if (sent > 0) console.warn(`[scheduled] enqueued ${sent} availability reminder(s)`);
  } finally {
    await executor.dispose();
  }
}
