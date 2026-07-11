import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, Player } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import type { DraftResponse, DraftedTeam } from "@saas/contracts/matchmaker";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { playerPublicId, parsePlayerPublicId } from "../ids.js";
import { draftBalancedTeams, MIN_TEAMS, MAX_TEAMS, type BalanceablePlayer } from "../engine/index.js";

interface ParsedDraft {
  playerUuids: Uuid[] | null;
  teamCount: number;
  teamNames: string[];
}

function parseDraftBody(
  body: unknown,
): { valid: true; value: ParsedDraft } | { valid: false; fields: Record<string, string[]> } {
  const req = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fields: Record<string, string[]> = {};

  let teamCount = 2;
  if (req.teamCount !== undefined) {
    if (typeof req.teamCount !== "number" || !Number.isInteger(req.teamCount) || req.teamCount < MIN_TEAMS || req.teamCount > MAX_TEAMS) {
      fields.teamCount = [`Must be an integer between ${MIN_TEAMS} and ${MAX_TEAMS}`];
    } else {
      teamCount = req.teamCount;
    }
  }

  let playerUuids: Uuid[] | null = null;
  if (req.playerIds !== undefined && req.playerIds !== null) {
    if (!Array.isArray(req.playerIds)) {
      fields.playerIds = ["Must be an array of player ids"];
    } else if (req.playerIds.length > 0) {
      const parsed: Uuid[] = [];
      for (const raw of req.playerIds) {
        const uuid = typeof raw === "string" ? parsePlayerPublicId(raw) : null;
        if (!uuid) {
          fields.playerIds = ["Contains an invalid player id"];
          break;
        }
        parsed.push(uuid);
      }
      if (!fields.playerIds) playerUuids = parsed;
    }
  }

  let teamNames: string[] = [];
  if (req.teamNames !== undefined && req.teamNames !== null) {
    if (!Array.isArray(req.teamNames) || req.teamNames.some((n) => typeof n !== "string")) {
      fields.teamNames = ["Must be an array of strings"];
    } else {
      teamNames = req.teamNames as string[];
    }
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }
  return { valid: true, value: { playerUuids, teamCount, teamNames } };
}

export interface HandleDraftDeps {
  repo?: MatchmakerRepository;
}

export async function handleDraft(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleDraftDeps,
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

  const parsed = parseDraftBody(body);
  if (!parsed.valid) {
    return validationError(requestId, parsed.fields);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.draft.run");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const playersResult = parsed.value.playerUuids
      ? await repo.listActivePlayersByIds(orgId, parsed.value.playerUuids)
      : await repo.listActivePlayers(orgId);
    if (!playersResult.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    const players: Player[] = playersResult.value;
    if (players.length < parsed.value.teamCount) {
      return errorResponse(
        "precondition_failed",
        `Need at least ${parsed.value.teamCount} players to draft ${parsed.value.teamCount} teams`,
        412,
        requestId,
        { reason: "insufficient_players", available: players.length },
      );
    }

    const balanceable: BalanceablePlayer[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      rating: p.rating,
    }));

    const result = draftBalancedTeams(balanceable, parsed.value.teamCount, parsed.value.teamNames);
    const teams: DraftedTeam[] = result.teams.map((team) => ({
      name: team.name,
      squadRating: team.squadRating,
      totalRating: team.totalRating,
      players: team.players.map((p) => ({
        id: playerPublicId(p.id),
        name: p.name,
        position: p.position,
        rating: p.rating,
      })),
    }));

    const response: DraftResponse = { teams, ratingSpread: result.ratingSpread };
    return successResponse(response, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
