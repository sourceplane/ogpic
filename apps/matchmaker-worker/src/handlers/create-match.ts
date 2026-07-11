import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, MatchTeamPlayer, MatchTeamSnapshot } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicMatch } from "../mappers.js";
import { generateShareToken } from "../ids.js";
import { isPlayerPosition } from "../engine/index.js";

const FORMAT_MAX = 20;
const NAME_MAX = 60;

function validateTeam(raw: unknown, label: string, fields: Record<string, string[]>): MatchTeamSnapshot | null {
  if (!raw || typeof raw !== "object") {
    fields[label] = ["Must be an object with a name and players"];
    return null;
  }
  const team = raw as Record<string, unknown>;
  if (typeof team.name !== "string" || team.name.trim().length < 1 || team.name.length > NAME_MAX) {
    fields[`${label}.name`] = [`Must be a string between 1 and ${NAME_MAX} characters`];
  }
  if (!Array.isArray(team.players) || team.players.length < 1) {
    fields[`${label}.players`] = ["Must be a non-empty array of players"];
    return null;
  }
  const players: MatchTeamPlayer[] = [];
  for (const raw of team.players) {
    if (!raw || typeof raw !== "object") {
      fields[`${label}.players`] = ["Each player must be an object"];
      return null;
    }
    const p = raw as Record<string, unknown>;
    if (
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      !isPlayerPosition(p.position) ||
      typeof p.rating !== "number" ||
      !Number.isInteger(p.rating) ||
      p.rating < 1 ||
      p.rating > 99
    ) {
      fields[`${label}.players`] = ["Each player needs id, name, position, and an integer rating 1–99"];
      return null;
    }
    players.push({ id: p.id, name: p.name, position: p.position, rating: p.rating });
  }
  if (fields[`${label}.name`]) return null;
  const squadRating = players.length > 0 ? Math.round(players.reduce((a, p) => a + p.rating, 0) / players.length) : 0;
  return { name: (team.name as string).trim(), players, squadRating };
}

export interface HandleCreateMatchDeps {
  repo?: MatchmakerRepository;
}

export async function handleCreateMatch(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleCreateMatchDeps,
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

  const req = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fields: Record<string, string[]> = {};

  let scheduledAt: Date | null = null;
  if (typeof req.scheduledAt !== "string" || Number.isNaN(Date.parse(req.scheduledAt))) {
    fields.scheduledAt = ["Must be a valid ISO 8601 date-time"];
  } else {
    scheduledAt = new Date(req.scheduledAt);
  }

  let format: string | null = null;
  if (req.format !== undefined && req.format !== null) {
    if (typeof req.format !== "string" || req.format.length > FORMAT_MAX) {
      fields.format = [`Must be a string of at most ${FORMAT_MAX} characters`];
    } else {
      format = req.format;
    }
  }

  const teamA = validateTeam(req.teamA, "teamA", fields);
  const teamB = validateTeam(req.teamB, "teamB", fields);

  if (Object.keys(fields).length > 0 || !scheduledAt || !teamA || !teamB) {
    return validationError(requestId, fields);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.createMatch({
      id: crypto.randomUUID(),
      orgId,
      scheduledAt,
      format,
      teamA,
      teamB,
      ratingA: teamA.squadRating,
      ratingB: teamB.squadRating,
      shareToken: generateShareToken(),
      createdAt: new Date(),
    });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ match: toPublicMatch(result.value) }, requestId, 201);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
