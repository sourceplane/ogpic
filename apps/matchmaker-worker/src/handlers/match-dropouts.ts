import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchDropout, MatchmakerRepository, MatchTeamPlayer, MatchTeamSnapshot } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { asUuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicMatch } from "../mappers.js";
import { playerPublicId, parsePlayerPublicId, matchPublicId } from "../ids.js";
import { formatMatchLabel } from "./match-polls.js";

const REASON_MAX = 120;

export interface MatchDropoutsDeps {
  repo?: MatchmakerRepository;
}

interface PublicDropout {
  matchId: string;
  playerId: string;
  reason: string;
  resolvedAt: string | null;
  createdAt: string;
}

function toPublicDropout(d: MatchDropout): PublicDropout {
  return {
    matchId: matchPublicId(d.matchId),
    playerId: playerPublicId(d.playerId),
    reason: d.reason,
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}

function parseDropoutBody(body: unknown): { valid: true; reason: string } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const reason = (body as Record<string, unknown>).reason;
  if (typeof reason !== "string" || reason.trim().length < 1 || reason.length > REASON_MAX) {
    return { valid: false, fields: { reason: [`Must be a string of 1–${REASON_MAX} characters`] } };
  }
  return { valid: true, reason: reason.trim() };
}

/**
 * PUT /v1/organizations/:orgId/matches/:matchId/dropout — self-service: the
 * caller's own claimed player pulls out of a scheduled/draft match.
 */
export async function handleSetDropout(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchDropoutsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }
  const parsed = parseDropoutBody(body);
  if (!parsed.valid) return validationError(requestId, parsed.fields);

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.dropout.set");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    const mine = await repo.getPlayerBySubject(orgId, actor.subjectId);
    if (!mine.ok) return errorResponse("not_found", "Not found", 404, requestId);

    const matchResult = await repo.getMatchById(orgId, matchId);
    if (!matchResult.ok) return errorResponse("not_found", "Not found", 404, requestId);
    if (matchResult.value.status !== "scheduled" && matchResult.value.status !== "draft") {
      return errorResponse("conflict", "This match is not open for drop-outs", 409, requestId);
    }

    const now = new Date();
    const playerId = asUuid(mine.value.id);
    const result = await repo.upsertDropout(orgId, matchId, playerId, parsed.reason, now);
    if (!result.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);

    // The chat feed is the manager notification here — this worker has no way
    // to look up which members are managers to contact them directly.
    const label = formatMatchLabel(matchResult.value.scheduledAt, matchResult.value.venue.name);
    await repo.insertChatMessage({
      id: crypto.randomUUID(),
      orgId,
      kind: "note",
      body: `${mine.value.name} dropped out of ${label} — ${parsed.reason}`,
      matchId,
      authorPlayerId: playerId,
      authorSubjectId: actor.subjectId,
      authorName: mine.value.name,
      createdAt: now,
    });

    return successResponse({ dropout: toPublicDropout(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/**
 * DELETE /v1/organizations/:orgId/matches/:matchId/dropout — self-service:
 * undo the caller's own dropout while it's still unresolved.
 */
export async function handleUndoDropout(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchDropoutsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.dropout.set");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    const mine = await repo.getPlayerBySubject(orgId, actor.subjectId);
    if (!mine.ok) return errorResponse("not_found", "Not found", 404, requestId);

    const result = await repo.deleteDropout(orgId, matchId, asUuid(mine.value.id));
    if (!result.ok) return errorResponse("not_found", "Not found", 404, requestId);

    return successResponse({ dropout: toPublicDropout(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/**
 * POST /v1/organizations/:orgId/matches/:matchId/dropouts/:playerId/resolve
 * Manager only. With `replacementPlayerId`, swaps the replacement into the
 * dropped player's slot in team_a/team_b; without it, just marks resolved
 * (the manager is adjusting the lineup manually elsewhere).
 */
export async function handleResolveDropout(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  playerId: Uuid,
  deps?: MatchDropoutsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }
  const req = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  let replacementPlayerId: Uuid | undefined;
  if (req.replacementPlayerId !== undefined && req.replacementPlayerId !== null) {
    if (typeof req.replacementPlayerId !== "string") {
      return validationError(requestId, { replacementPlayerId: ["Must be a string"] });
    }
    const parsedId = parsePlayerPublicId(req.replacementPlayerId);
    if (!parsedId) return validationError(requestId, { replacementPlayerId: ["Invalid player id"] });
    replacementPlayerId = parsedId;
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.poll.manage");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const now = new Date();

    // Resolve first: it's the idempotency gate. Only on success (i.e. there
    // was actually an unresolved dropout) do we apply the team swap and post
    // the chat note — otherwise a double-click/retry would replay those
    // side effects against an already-resolved dropout.
    const resolved = await repo.resolveDropout(orgId, matchId, playerId, now);
    if (!resolved.ok) return errorResponse("not_found", "Not found", 404, requestId);

    let updatedMatch = null;
    if (replacementPlayerId !== undefined) {
      const matchResult = await repo.getMatchById(orgId, matchId);
      if (!matchResult.ok) return errorResponse("not_found", "Not found", 404, requestId);
      const match = matchResult.value;

      const replacementResult = await repo.getPlayerById(orgId, replacementPlayerId);
      if (!replacementResult.ok) {
        return validationError(requestId, { replacementPlayerId: ["Replacement is not on the active roster"] });
      }
      const droppedResult = await repo.getPlayerById(orgId, playerId);
      const droppedName = droppedResult.ok ? droppedResult.value.name : "Player";

      const droppedPublicId = playerPublicId(playerId);
      const replacement: MatchTeamPlayer = {
        id: playerPublicId(replacementPlayerId),
        name: replacementResult.value.name,
        position: replacementResult.value.position,
        rating: replacementResult.value.rating,
      };

      const swap = (team: MatchTeamSnapshot): MatchTeamSnapshot => {
        const idx = team.players.findIndex((p) => p.id === droppedPublicId);
        if (idx === -1) return team;
        const players = team.players.slice();
        players[idx] = replacement;
        const squadRating =
          players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length) : 0;
        return { ...team, players, squadRating };
      };

      const teamA = swap(match.teamA);
      const teamB = swap(match.teamB);

      const updateResult = await repo.updateMatch(orgId, matchId, {
        scheduledAt: null,
        status: null,
        scoreA: null,
        scoreB: null,
        venue: null,
        teamA,
        teamB,
        updatedAt: now,
      });
      if (!updateResult.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);
      updatedMatch = updateResult.value;

      const label = formatMatchLabel(match.scheduledAt, match.venue.name);
      await repo.insertChatMessage({
        id: crypto.randomUUID(),
        orgId,
        kind: "note",
        body: `${replacement.name} replaces ${droppedName} in ${label}`,
        matchId,
        authorPlayerId: null,
        authorSubjectId: actor.subjectId,
        authorName: null,
        createdAt: now,
      });
    }

    return successResponse(
      { dropout: toPublicDropout(resolved.value), match: updatedMatch ? toPublicMatch(updatedMatch) : null },
      requestId,
    );
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
