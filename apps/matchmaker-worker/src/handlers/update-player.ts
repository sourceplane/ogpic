import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, Player, PlayerPosition } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicPlayer } from "../mappers.js";
import { computeOvr, isPlayerPosition, validateAttributes } from "../engine/index.js";
import { validateEmail } from "./player-email.js";

const NAME_MIN = 1;
const NAME_MAX = 80;

export interface ResolvedUpdate {
  name: string;
  position: PlayerPosition;
  attributes: Record<string, number>;
  rating: number;
  email: string | null;
}

/**
 * Merge a PATCH body onto the existing player and revalidate. If the position
 * changes, a matching `attributes` set MUST be supplied (the old attribute keys
 * no longer fit the new position class), otherwise the request is a 422.
 */
export function resolvePlayerUpdate(
  existing: Pick<Player, "name" | "position" | "attributes" | "email">,
  body: unknown,
): { valid: true; value: ResolvedUpdate } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const req = body as Record<string, unknown>;
  const fields: Record<string, string[]> = {};

  let name = existing.name;
  if (req.name !== undefined) {
    if (typeof req.name !== "string" || req.name.trim().length < NAME_MIN || req.name.length > NAME_MAX) {
      fields.name = [`Must be a string between ${NAME_MIN} and ${NAME_MAX} characters`];
    } else {
      name = req.name.trim();
    }
  }

  let position = existing.position;
  if (req.position !== undefined) {
    if (!isPlayerPosition(req.position)) {
      fields.position = ["Must be one of GK, DEF, MID, FWD, ALL"];
    } else {
      position = req.position;
    }
  }

  const positionChanged = position !== existing.position;
  let attributes = existing.attributes;
  if (req.attributes !== undefined) {
    if (isPlayerPosition(position)) {
      const attrCheck = validateAttributes(position, req.attributes);
      if (!attrCheck.valid) {
        fields.attributes = [attrCheck.reason];
      } else {
        attributes = attrCheck.attributes;
      }
    }
  } else if (positionChanged) {
    fields.attributes = ["A matching attributes set is required when changing position"];
  }

  let email = existing.email;
  if (req.email !== undefined) {
    email = validateEmail(req.email, fields);
  }

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  return { valid: true, value: { name, position, attributes, rating: computeOvr(attributes), email } };
}

export interface HandleUpdatePlayerDeps {
  repo?: MatchmakerRepository;
}

export async function handleUpdatePlayer(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  playerId: Uuid,
  deps?: HandleUpdatePlayerDeps,
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

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const existing = await repo.getPlayerById(orgId, playerId);
    if (!existing.ok) {
      return errorResponse("not_found", "Not found", 404, requestId);
    }

    const resolved = resolvePlayerUpdate(existing.value, body);
    if (!resolved.valid) {
      return validationError(requestId, resolved.fields);
    }

    const result = await repo.updatePlayer(orgId, playerId, {
      name: resolved.value.name,
      position: resolved.value.position,
      rating: resolved.value.rating,
      attributes: resolved.value.attributes,
      email: resolved.value.email,
      updatedAt: new Date(),
    });
    if (!result.ok) {
      if (result.error.kind === "not_found") {
        return errorResponse("not_found", "Not found", 404, requestId);
      }
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ player: toPublicPlayer(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
