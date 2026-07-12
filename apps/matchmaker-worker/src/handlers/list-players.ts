import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, PlayerPosition } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { errorResponse, validationError, pagedResponse } from "../http.js";
import { toPublicPlayer } from "../mappers.js";
import { parsePageParams, encodeCursor } from "../pagination.js";
import { isPlayerPosition } from "../engine/index.js";

export interface HandleListPlayersDeps {
  repo?: MatchmakerRepository;
}

export async function handleListPlayers(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleListPlayersDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const url = new URL(request.url);
  const pageResult = parsePageParams(url);
  if (!pageResult.ok) {
    return validationError(requestId, { [pageResult.field]: [pageResult.reason] });
  }

  const positionParam = url.searchParams.get("position");
  let position: PlayerPosition | null = null;
  if (positionParam !== null) {
    if (!isPlayerPosition(positionParam)) {
      return validationError(requestId, { position: ["Must be one of GK, DEF, MID, FWD, ALL"] });
    }
    position = positionParam;
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.read");
  if (denied) return denied;

  const { limit, cursor } = pageResult.value;
  const dbCursor = cursor ? { createdAt: cursor.t, id: cursor.id } : null;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.listPlayersPaged(orgId, { limit, cursor: dbCursor }, position);
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    // Blend community votes into each player's published OVR. A failed stats
    // read degrades gracefully to baseline ratings rather than failing the list.
    const statsResult = await repo.listPlayerVoteStats(orgId);
    const statsByPlayer = new Map(
      statsResult.ok ? statsResult.value.map((s) => [s.playerId, s]) : [],
    );
    const players = result.value.items.map((p) => toPublicPlayer(p, statsByPlayer.get(p.id) ?? null));
    const nextCursor = result.value.nextCursor
      ? encodeCursor(result.value.nextCursor.createdAt, result.value.nextCursor.id)
      : null;
    return pagedResponse({ players }, requestId, nextCursor);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
