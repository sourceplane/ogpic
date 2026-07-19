import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type { ChatMessage, ChatMessageKind, MatchmakerRepository } from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { chatMessagePublicId, matchPublicId, parseChatMessagePublicId, playerPublicId } from "../ids.js";

export interface HandleChatDeps {
  repo?: MatchmakerRepository;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const BODY_MIN = 1;
const BODY_MAX = 2000;
const EMOJI_MAX = 8;


export interface PublicChatMessage {
  id: string;
  kind: ChatMessageKind;
  body: string;
  matchId: string | null;
  authorPlayerId: string | null;
  authorSubjectId: string | null;
  authorName: string | null;
  reactions: Record<string, string[]>;
  createdAt: string;
}

function toPublicChatMessage(message: ChatMessage): PublicChatMessage {
  return {
    id: chatMessagePublicId(message.id),
    kind: message.kind,
    body: message.body,
    matchId: message.matchId ? matchPublicId(message.matchId) : null,
    authorPlayerId: message.authorPlayerId ? playerPublicId(message.authorPlayerId) : null,
    authorSubjectId: message.authorSubjectId,
    authorName: message.authorName,
    reactions: message.reactions,
    createdAt: message.createdAt.toISOString(),
  };
}

type ParseListParamsResult =
  | { valid: true; limit: number; before: Date | null; beforeId: string | null }
  | { valid: false; fields: Record<string, string[]> };

function parseListParams(url: URL): ParseListParamsResult {
  const limitParam = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return { valid: false, fields: { limit: ["Must be an integer between 1 and 100"] } };
    }
    limit = parsed;
  }

  const beforeParam = url.searchParams.get("before");
  let before: Date | null = null;
  if (beforeParam !== null) {
    const parsed = new Date(beforeParam);
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, fields: { before: ["Must be a valid ISO timestamp"] } };
    }
    before = parsed;
  }

  const beforeIdParam = url.searchParams.get("beforeId");
  let beforeId: string | null = null;
  if (beforeIdParam !== null) {
    const parsedId = parseChatMessagePublicId(beforeIdParam);
    if (!parsedId) {
      return { valid: false, fields: { beforeId: ["Invalid chat message id"] } };
    }
    beforeId = parsedId;
  }

  return { valid: true, limit, before, beforeId };
}

/** GET /v1/organizations/:orgId/chat?limit=&before=&beforeId= — squad chat feed, newest first. */
export async function handleChatList(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleChatDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  const url = new URL(request.url);
  const parsed = parseListParams(url);
  if (!parsed.valid) {
    return validationError(requestId, parsed.fields);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.chat.read");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.listChatMessages(orgId, {
      limit: parsed.limit,
      before: parsed.before,
      beforeId: parsed.beforeId,
    });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ messages: result.value.map(toPublicChatMessage) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

type ValidateChatBodyResult =
  | { valid: true; body: string }
  | { valid: false; fields: Record<string, string[]> };

function validateChatBody(payload: unknown): ValidateChatBodyResult {
  if (typeof payload !== "object" || payload === null) {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const raw = (payload as { body?: unknown }).body;
  if (typeof raw !== "string") {
    return { valid: false, fields: { body: ["Must be a string"] } };
  }
  const trimmed = raw.trim();
  if (trimmed.length < BODY_MIN || trimmed.length > BODY_MAX) {
    return { valid: false, fields: { body: [`Must be ${BODY_MIN}-${BODY_MAX} characters`] } };
  }
  return { valid: true, body: trimmed };
}

/** The display name a `text` chat message should be authored under: the name
 *  of the roster player this subject has claimed, or (when nobody has claimed
 *  a player for this subject yet) the local-part of their account email. */
function localPartOf(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

/** POST /v1/organizations/:orgId/chat — post a text message to the squad chat. */
export async function handleChatPost(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  deps?: HandleChatDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  const validation = validateChatBody(payload);
  if (!validation.valid) {
    return validationError(requestId, validation.fields);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.chat.post");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    // Same subject→player lookup availability self-service uses: post under
    // the claimed roster player's name when one exists, else the account
    // email's local-part.
    const claimed = await repo.getPlayerBySubject(orgId, actor.subjectId);
    let authorPlayerId: string | null = null;
    let authorName: string;
    if (claimed.ok) {
      authorPlayerId = claimed.value.id;
      authorName = claimed.value.name;
    } else {
      const email = actor.email?.trim();
      authorName = email ? localPartOf(email) : "Member";
    }

    const result = await repo.insertChatMessage({
      id: crypto.randomUUID(),
      orgId,
      kind: "text",
      body: validation.body,
      matchId: null,
      authorPlayerId,
      authorSubjectId: actor.subjectId,
      authorName,
      createdAt: new Date(),
    });
    if (!result.ok) {
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ message: toPublicChatMessage(result.value) }, requestId, 201);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

type ValidateEmojiResult =
  | { valid: true; emoji: string }
  | { valid: false; fields: Record<string, string[]> };

function validateEmoji(payload: unknown): ValidateEmojiResult {
  if (typeof payload !== "object" || payload === null) {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const emoji = (payload as { emoji?: unknown }).emoji;
  if (typeof emoji !== "string" || emoji.length === 0 || emoji.length > EMOJI_MAX) {
    return { valid: false, fields: { emoji: [`Must be a non-empty string up to ${EMOJI_MAX} characters`] } };
  }
  return { valid: true, emoji };
}

/** PUT /v1/organizations/:orgId/chat/:messageId/reactions — toggle the actor's reaction. */
export async function handleChatReact(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  messageId: Uuid,
  deps?: HandleChatDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }

  const validation = validateEmoji(payload);
  if (!validation.valid) {
    return validationError(requestId, validation.fields);
  }

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.chat.post");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const result = await repo.toggleChatReaction(orgId, messageId, validation.emoji, actor.subjectId);
    if (!result.ok) {
      if (result.error.kind === "not_found") {
        return errorResponse("not_found", "Not found", 404, requestId);
      }
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }
    return successResponse({ message: toPublicChatMessage(result.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
