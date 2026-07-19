import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, MatchTeamPlayer, MatchTeamSnapshot } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { asUuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicMatch } from "../mappers.js";
import { generateShareToken, matchPublicId } from "../ids.js";
import { isPlayerPosition } from "../engine/index.js";
import { parseVenueInput, EMPTY_VENUE } from "./venue.js";
import { enqueueNotification, buildIdempotencyKey } from "@saas/notifications-client";
import {
  buildPollOptionInputs,
  computeDeadlineAt,
  earliestStartsAt,
  parsePollInput,
  type ParsedPollInput,
} from "./match-polls.js";

const FORMAT_MAX = 20;
const NAME_MAX = 60;

/** A match created with no roster yet (v5 poll flow — teams are drafted later). */
const EMPTY_TEAM: MatchTeamSnapshot = { name: "", players: [], squadRating: 0 };

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

  // v5: a `poll` block starts the match in the poll → finalizing → draft
  // lifecycle instead of scheduling it directly — no fixed time/venue/teams
  // yet, so those become optional (and are ignored if supplied).
  const hasPoll = req.poll !== undefined && req.poll !== null;
  const pollInput: ParsedPollInput | null = hasPoll ? parsePollInput(req.poll, fields) : null;

  let scheduledAt: Date | null = null;
  if (hasPoll) {
    if (req.scheduledAt !== undefined && req.scheduledAt !== null) {
      if (typeof req.scheduledAt !== "string" || Number.isNaN(Date.parse(req.scheduledAt))) {
        fields.scheduledAt = ["Must be a valid ISO 8601 date-time"];
      } else {
        scheduledAt = new Date(req.scheduledAt);
      }
    }
  } else if (typeof req.scheduledAt !== "string" || Number.isNaN(Date.parse(req.scheduledAt))) {
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

  const teamA = hasPoll ? EMPTY_TEAM : validateTeam(req.teamA, "teamA", fields);
  const teamB = hasPoll ? EMPTY_TEAM : validateTeam(req.teamB, "teamB", fields);
  const venue = parseVenueInput(req.venue, fields) ?? EMPTY_VENUE;

  if (Object.keys(fields).length > 0 || !teamA || !teamB) {
    return validationError(requestId, fields);
  }

  // With a poll, the provisional kickoff is the earliest time option that has
  // a fixed start, falling back to an explicit `scheduledAt`; one of the two
  // must be present since scheduled_at is never null.
  if (hasPoll && pollInput) {
    scheduledAt = earliestStartsAt(pollInput) ?? scheduledAt;
  }
  if (!scheduledAt) {
    return validationError(requestId, {
      scheduledAt: hasPoll
        ? ["Must provide scheduledAt or at least one poll time with startsAt"]
        : ["Must be a valid ISO 8601 date-time"],
    });
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.fixture.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const createdAt = new Date();
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
      createdAt,
    });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    let match = result.value;

    if (pollInput) {
      // Status starts at 'poll' rather than the table default ('scheduled').
      const statusResult = await repo.updateMatch(orgId, asUuid(match.id), {
        scheduledAt: null,
        status: "poll",
        scoreA: null,
        scoreB: null,
        venue: null,
        teamA: null,
        teamB: null,
        updatedAt: createdAt,
      });
      if (statusResult.ok) match = statusResult.value;

      const pollResult = await repo.createMatchPoll(
        {
          matchId: asUuid(match.id),
          orgId,
          deadlineKind: pollInput.deadlineKind,
          deadlineAt: computeDeadlineAt(pollInput.deadlineKind, createdAt),
          options: buildPollOptionInputs(pollInput),
        },
        createdAt,
      );

      if (pollResult.ok) {
        await repo.insertChatMessage({
          id: crypto.randomUUID(),
          orgId,
          kind: "poll",
          body: `New match poll: ${pollInput.times[0]?.label ?? "pick a time"}`,
          matchId: match.id,
          authorPlayerId: null,
          authorSubjectId: actor.subjectId,
          authorName: null,
          createdAt,
        });

        const settingsResult = await repo.getOrgSettings(orgId);
        if (settingsResult.ok && settingsResult.value?.whatsappBridge) {
          await repo.insertChatMessage({
            id: crypto.randomUUID(),
            orgId,
            kind: "note",
            body: "Mirrored to WhatsApp — no-app players vote by reply",
            matchId: match.id,
            authorPlayerId: null,
            authorSubjectId: null,
            authorName: null,
            createdAt,
          });
        }
      }
    }

    // Best-effort, post-commit: ask every reachable player to set their
    // availability — over email and/or WhatsApp, whichever contacts they have.
    // Never blocks or fails the 201 (the client swallows errors, an absent
    // binding is a no-op), is skipped under DEBUG_DELIVERY, and is per
    // (match, player, channel) idempotent so a retried create collapses cleanly.
    // Not sent for a polled match — the poll (and its WhatsApp mirror) is the
    // player-facing ask, not a generic "confirm you're in" notification.
    if (!pollInput && env.DEBUG_DELIVERY !== "true") {
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
