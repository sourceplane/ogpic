import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, MatchTeamPlayer, MatchTeamSnapshot } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicMatch } from "../mappers.js";
import { generateShareToken, matchPublicId } from "../ids.js";
import { isPlayerPosition } from "../engine/index.js";
import { parseVenueInput, EMPTY_VENUE } from "./venue.js";
import { enqueueNotification, buildIdempotencyKey } from "@saas/notifications-client";

const FORMAT_MAX = 20;
const NAME_MAX = 60;

export function validateTeam(raw: unknown, label: string, fields: Record<string, string[]>): MatchTeamSnapshot | null {
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
  /** Injectable enqueue for tests; defaults to the real notifications client. */
  enqueueNotification?: typeof enqueueNotification;
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
  const venue = parseVenueInput(req.venue, fields) ?? EMPTY_VENUE;

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
      venue,
      shareToken: generateShareToken(),
      createdAt: new Date(),
    });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    const match = result.value;
    // Best-effort, post-commit: ask every reachable player to set their
    // availability — over email and/or WhatsApp, whichever contacts they have.
    // Never blocks or fails the 201 (the client swallows errors, an absent
    // binding is a no-op), is skipped under DEBUG_DELIVERY, and is per
    // (match, player, channel) idempotent so a retried create collapses cleanly.
    if (env.DEBUG_DELIVERY !== "true") {
      const enqueueFn = deps?.enqueueNotification ?? enqueueNotification;
      const roster = await repo.listActivePlayers(orgId);
      if (roster.ok) {
        const publicMatchId = matchPublicId(match.id);
        const ctx = {
          internalActor: "matchmaker-worker",
          actorSubjectType: actor.subjectType,
          actorSubjectId: actor.subjectId,
          requestId,
        };
        const templateData = {
          scheduledAt: match.scheduledAt.toISOString(),
          venue: match.venue.name ?? "",
          matchId: publicMatchId,
        };
        const send = (channel: "email" | "whatsapp", address: string, playerId: string) =>
          enqueueFn(env, ctx, {
            orgId,
            category: "product",
            templateKey: "match.availability_request",
            templateData,
            recipient: { channel, address },
            idempotencyKey: buildIdempotencyKey("match.availability_request", publicMatchId, channel, playerId),
            correlationId: requestId,
          });
        for (const player of roster.value) {
          if (player.email) await send("email", player.email, player.id);
          if (player.phone) await send("whatsapp", player.phone, player.id);
        }
      }
    }

    return successResponse({ match: toPublicMatch(match) }, requestId, 201);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
