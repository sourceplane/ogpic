import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import type { MatchShareResponse } from "@saas/contracts/matchmaker";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse } from "../http.js";
import { matchPublicId } from "../ids.js";
import { buildShareText, buildShareLinks } from "../engine/index.js";

export interface HandleShareMatchDeps {
  repo?: MatchmakerRepository;
}

export async function handleShareMatch(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: HandleShareMatchDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.getMatchById(orgId, matchId);
    if (!result.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }
    const match = result.value;
    const text = buildShareText({
      scheduledAt: match.scheduledAt,
      ratingA: Number(match.ratingA),
      ratingB: Number(match.ratingB),
      teamA: { name: match.teamA.name, players: match.teamA.players },
      teamB: { name: match.teamB.name, players: match.teamB.players },
    });
    const links = buildShareLinks(text);
    const response: MatchShareResponse = {
      matchId: matchPublicId(match.id),
      shareToken: match.shareToken,
      text,
      whatsappUrl: links.whatsappUrl,
      mailtoUrl: links.mailtoUrl,
    };
    return successResponse(response, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
