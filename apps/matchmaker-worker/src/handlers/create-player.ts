import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { MatchmakerRepository, PlayerPosition } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicPlayer } from "../mappers.js";
import { computeOvr, defaultAttributes, isPlayerPosition, validateAttributes } from "../engine/index.js";
import { validateEmail } from "./player-email.js";

const NAME_MIN = 1;
const NAME_MAX = 80;

export interface ValidatedPlayer {
  name: string;
  position: PlayerPosition;
  attributes: Record<string, number>;
  rating: number;
  email: string | null;
}

export function validatePlayerBody(
  body: unknown,
): { valid: true; value: ValidatedPlayer } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const req = body as Record<string, unknown>;
  const fields: Record<string, string[]> = {};

  if (typeof req.name !== "string" || req.name.trim().length < NAME_MIN || req.name.length > NAME_MAX) {
    fields.name = [`Must be a string between ${NAME_MIN} and ${NAME_MAX} characters`];
  }

  if (!isPlayerPosition(req.position)) {
    fields.position = ["Must be one of GK, DEF, MID, FWD, ALL"];
  }

  // Attributes are optional: a manager can add a player with just a name and
  // position and the roster seeds a default strength (OVR 60), adjustable later
  // or shifted by community voting.
  let attributes: Record<string, number> = {};
  if (isPlayerPosition(req.position)) {
    if (req.attributes === undefined || req.attributes === null) {
      attributes = defaultAttributes(req.position);
    } else {
      const attrCheck = validateAttributes(req.position, req.attributes);
      if (!attrCheck.valid) {
        fields.attributes = [attrCheck.reason];
      } else {
        attributes = attrCheck.attributes;
      }
    }
  }

  const email = validateEmail(req.email, fields);

  if (Object.keys(fields).length > 0) {
    return { valid: false, fields };
  }

  const position = req.position as PlayerPosition;
  return {
    valid: true,
    value: { name: (req.name as string).trim(), position, attributes, rating: computeOvr(attributes), email },
  };
}

export interface HandleCreatePlayerDeps {
  repo?: MatchmakerRepository;
}

export async function handleCreatePlayer(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleCreatePlayerDeps,
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

  const validation = validatePlayerBody(body);
  if (!validation.valid) {
    return validationError(requestId, validation.fields);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.roster.write");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.createPlayer({
      id: crypto.randomUUID(),
      orgId,
      name: validation.value.name,
      position: validation.value.position,
      rating: validation.value.rating,
      attributes: validation.value.attributes,
      email: validation.value.email,
      createdAt: new Date(),
    });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ player: toPublicPlayer(result.value) }, requestId, 201);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
