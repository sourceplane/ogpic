import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type {
  InsertRatingRoundResultInput,
  MatchmakerRepository,
  RatingRound,
  RatingRoundDeadlineKind,
} from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { asUuid } from "@saas/db/ids";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { playerPublicId } from "../ids.js";
import { DEFAULT_ATTRIBUTE_VALUE, effectiveRating } from "../engine/index.js";
import { computeDeadlineAt } from "./match-polls.js";

const DEADLINE_KINDS: RatingRoundDeadlineKind[] = ["24h", "48h", "manual"];

export interface RatingRoundDeps {
  repo?: MatchmakerRepository;
}

interface PublicRatingRound {
  id: string;
  status: RatingRound["status"];
  openedAt: string;
  closedAt: string | null;
  deadlineKind: RatingRoundDeadlineKind;
  deadlineAt: string | null;
}

interface PublicRatingRoundResult {
  playerId: string;
  ovrBefore: number;
  ovrAfter: number;
  delta: number;
  votesReceived: number;
}

function toPublicRound(round: RatingRound): PublicRatingRound {
  return {
    id: round.id,
    status: round.status,
    openedAt: round.openedAt.toISOString(),
    closedAt: round.closedAt ? round.closedAt.toISOString() : null,
    deadlineKind: round.deadlineKind,
    deadlineAt: round.deadlineAt ? round.deadlineAt.toISOString() : null,
  };
}

export function ratingRoundOpenedNoteBody(deadlineKind: RatingRoundDeadlineKind): string {
  if (deadlineKind === "manual") return "Rating window opened — rate your teammates!";
  return `Rating window opened — closes in ${deadlineKind}`;
}

export function ratingRoundClosedNoteBody(): string {
  return "Rating window closed — scores updated";
}

/**
 * Settle a just-closed round: for every active player with at least one
 * community vote on file, blend their manager-authored baseline with the
 * current vote stats (the exact `effectiveRating` blend used everywhere else
 * — list/get/draft) and record the before → after movement. Unrated players
 * get no row (nothing moved for them). Exported so `scheduled.ts`'s cron
 * sweep settles due rounds the same way a manual close does.
 */
export async function settleRatingRound(
  repo: MatchmakerRepository,
  orgId: Uuid,
  round: RatingRound,
  now: Date,
): Promise<void> {
  const playersResult = await repo.listActivePlayers(orgId);
  if (!playersResult.ok) return;
  const statsResult = await repo.listPlayerVoteStats(orgId);
  const statsByPlayer = new Map(statsResult.ok ? statsResult.value.map((s) => [s.playerId, s]) : []);

  const rows: InsertRatingRoundResultInput[] = [];
  for (const player of playersResult.value) {
    const stats = statsByPlayer.get(player.id);
    const votesReceived = stats?.voterCount ?? 0;
    if (votesReceived <= 0) continue;
    const ovrBefore = player.rating;
    const ovrAfter = effectiveRating(ovrBefore, votesReceived, stats?.avgStars ?? 0);
    rows.push({
      roundId: asUuid(round.id),
      orgId,
      playerId: asUuid(player.id),
      ovrBefore,
      ovrAfter,
      votesReceived,
      createdAt: now,
    });
  }
  if (rows.length > 0) {
    await repo.insertRatingRoundResults(rows);
  }
}

/**
 * GET /rating-round — any member: the current window's state plus the latest
 * closed round's settled deltas. `results` is omitted (not `null`) when no
 * round has ever closed.
 */
export async function handleGetRatingRound(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: RatingRoundDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) return errorResponse("internal_error", "Service unavailable", 503, requestId);
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    const [openResult, closedResult, playersResult] = await Promise.all([
      repo.getOpenRatingRound(orgId),
      repo.getLatestClosedRatingRound(orgId),
      repo.listActivePlayers(orgId),
    ]);
    if (!openResult.ok || !closedResult.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);

    const open = openResult.value;
    const closed = closedResult.value;
    const current = open ?? closed;
    const eligible = playersResult.ok ? playersResult.value.length : 0;

    let ratedCount = 0;
    let results: PublicRatingRoundResult[] | undefined;

    if (open) {
      const statsResult = await repo.listPlayerVoteStats(orgId);
      if (statsResult.ok) {
        const activeIds = new Set(playersResult.ok ? playersResult.value.map((p) => p.id) : []);
        ratedCount = statsResult.value.filter((s) => activeIds.has(s.playerId) && s.voterCount > 0).length;
      }
    }

    if (closed) {
      const resultsResult = await repo.listRatingRoundResults(orgId, asUuid(closed.id));
      if (resultsResult.ok) {
        results = resultsResult.value.map((r) => ({
          playerId: playerPublicId(r.playerId),
          ovrBefore: r.ovrBefore,
          ovrAfter: r.ovrAfter,
          delta: r.ovrAfter - r.ovrBefore,
          votesReceived: r.votesReceived,
        }));
        if (!open) ratedCount = results.length;
      }
    }

    return successResponse(
      {
        status: open ? "open" : "closed",
        deadlineKind: current?.deadlineKind ?? "manual",
        deadlineAt: current?.deadlineAt ? current.deadlineAt.toISOString() : null,
        closedAt: current?.closedAt ? current.closedAt.toISOString() : null,
        ratedCount,
        eligible,
        ...(results ? { results } : {}),
      },
      requestId,
    );
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /rating-round/open — open a voting window (manager). Optionally reset. */
export async function handleOpenRatingRound(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: RatingRoundDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) return errorResponse("internal_error", "Service unavailable", 503, requestId);

  let resetScores = false;
  let deadlineKind: RatingRoundDeadlineKind = "manual";
  try {
    const text = await request.text();
    if (text) {
      const body = JSON.parse(text) as Record<string, unknown>;
      if (body.resetScores !== undefined) {
        if (typeof body.resetScores !== "boolean") return validationError(requestId, { resetScores: ["Must be a boolean"] });
        resetScores = body.resetScores;
      }
      if (body.deadline !== undefined) {
        if (typeof body.deadline !== "string" || !DEADLINE_KINDS.includes(body.deadline as RatingRoundDeadlineKind)) {
          return validationError(requestId, { deadline: ["Must be one of 24h, 48h, manual"] });
        }
        deadlineKind = body.deadline as RatingRoundDeadlineKind;
      }
    }
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const now = new Date();
    if (resetScores) {
      const reset = await repo.resetScoresToBaseline(orgId, DEFAULT_ATTRIBUTE_VALUE, now);
      if (!reset.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    const deadlineAt = computeDeadlineAt(deadlineKind, now);
    const opened = await repo.openRatingRound({
      id: crypto.randomUUID(),
      orgId,
      openedBy: actor.subjectId,
      deadlineKind,
      deadlineAt,
      now,
    });
    if (!opened.ok) {
      if (opened.error.kind === "conflict") {
        return errorResponse("conflict", "A rating round is already open", 409, requestId);
      }
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    await repo.insertChatMessage({
      id: crypto.randomUUID(),
      orgId,
      kind: "note",
      body: ratingRoundOpenedNoteBody(deadlineKind),
      matchId: null,
      authorPlayerId: null,
      authorSubjectId: actor.subjectId,
      authorName: null,
      createdAt: now,
    });
    return successResponse({ round: toPublicRound(opened.value) }, requestId, 201);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /rating-round/close — close the open voting window (manager) and settle scores. */
export async function handleCloseRatingRound(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: RatingRoundDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) return errorResponse("internal_error", "Service unavailable", 503, requestId);
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const now = new Date();
    const closed = await repo.closeRatingRound(orgId, now);
    if (!closed.ok) {
      return errorResponse("not_found", "No rating round is open", 404, requestId);
    }
    await settleRatingRound(repo, orgId, closed.value, now);
    await repo.insertChatMessage({
      id: crypto.randomUUID(),
      orgId,
      kind: "note",
      body: ratingRoundClosedNoteBody(),
      matchId: null,
      authorPlayerId: null,
      authorSubjectId: actor.subjectId,
      authorName: null,
      createdAt: now,
    });
    return successResponse({ round: toPublicRound(closed.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
