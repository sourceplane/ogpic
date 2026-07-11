import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, MatchStatus } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicMatch } from "../mappers.js";

const MATCH_STATUSES: MatchStatus[] = ["scheduled", "played", "cancelled"];

interface ParsedMatchUpdate {
  scheduledAt: Date | null;
  status: MatchStatus | null;
  scoreA: number | null;
  scoreB: number | null;
  hasAny: boolean;
}

function parseUpdate(
  body: unknown,
): { valid: true; value: ParsedMatchUpdate } | { valid: false; fields: Record<string, string[]> } {
  const req = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const fields: Record<string, string[]> = {};

  let scheduledAt: Date | null = null;
  if (req.scheduledAt !== undefined) {
    if (typeof req.scheduledAt !== "string" || Number.isNaN(Date.parse(req.scheduledAt))) {
      fields.scheduledAt = ["Must be a valid ISO 8601 date-time"];
    } else {
      scheduledAt = new Date(req.scheduledAt);
    }
  }

  let status: MatchStatus | null = null;
  if (req.status !== undefined) {
    if (typeof req.status !== "string" || !MATCH_STATUSES.includes(req.status as MatchStatus)) {
      fields.status = ["Must be one of scheduled, played, cancelled"];
    } else {
      status = req.status as MatchStatus;
    }
  }

  const parseScore = (key: "scoreA" | "scoreB"): number | null => {
    const value = req[key];
    if (value === undefined) return null;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      fields[key] = ["Must be a non-negative integer"];
      return null;
    }
    return value;
  };
  const scoreA = parseScore("scoreA");
  const scoreB = parseScore("scoreB");

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  const hasAny =
    scheduledAt !== null || status !== null || req.scoreA !== undefined || req.scoreB !== undefined;
  return { valid: true, value: { scheduledAt, status, scoreA, scoreB, hasAny } };
}

export interface HandleUpdateMatchDeps {
  repo?: MatchmakerRepository;
}

export async function handleUpdateMatch(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: HandleUpdateMatchDeps,
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

  const parsed = parseUpdate(body);
  if (!parsed.valid) {
    return validationError(requestId, parsed.fields);
  }
  if (!parsed.value.hasAny) {
    return validationError(requestId, { body: ["At least one updatable field is required"] });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.updateMatch(orgId, matchId, {
      scheduledAt: parsed.value.scheduledAt,
      status: parsed.value.status,
      scoreA: parsed.value.scoreA,
      scoreB: parsed.value.scoreB,
      updatedAt: new Date(),
    });
    if (!result.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }
    return successResponse({ match: toPublicMatch(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
