import type { Env } from "./env.js";
import { handleHealth } from "./handlers/health.js";
import { handleCreatePlayer } from "./handlers/create-player.js";
import { handleListPlayers } from "./handlers/list-players.js";
import { handleGetPlayer } from "./handlers/get-player.js";
import { handleUpdatePlayer } from "./handlers/update-player.js";
import { handleArchivePlayer } from "./handlers/archive-player.js";
import { handleSuggestPosition } from "./handlers/suggest-position.js";
import { handleRosterSummary } from "./handlers/roster-summary.js";
import { handleDraft } from "./handlers/draft.js";
import { handleCreateMatch } from "./handlers/create-match.js";
import { handleListMatches } from "./handlers/list-matches.js";
import { handleGetMatch } from "./handlers/get-match.js";
import { handleUpdateMatch } from "./handlers/update-match.js";
import { handleCancelMatch } from "./handlers/cancel-match.js";
import { handleShareMatch } from "./handlers/share-match.js";
import { handleListAvailability } from "./handlers/list-availability.js";
import { handleSetAvailability } from "./handlers/set-availability.js";
import { errorResponse, notFound, methodNotAllowed } from "./http.js";
import { generateRequestId, parseOrgPublicId, parsePlayerPublicId, parseMatchPublicId } from "./ids.js";

const REQUEST_ID_RE = /^[\w-]{1,128}$/;

export interface ActorContext {
  subjectId: string;
  subjectType: string;
}

function resolveRequestId(request: Request): string {
  const header = request.headers.get("x-request-id");
  if (header && REQUEST_ID_RE.test(header)) return header;
  return generateRequestId();
}

function resolveActor(request: Request): ActorContext | null {
  const subjectId = request.headers.get("x-actor-subject-id");
  const subjectType = request.headers.get("x-actor-subject-type");
  if (!subjectId || !subjectType) return null;
  return { subjectId, subjectType };
}

const ORG_PLAYERS_RE = /^\/v1\/organizations\/([^/]+)\/players$/;
const ORG_PLAYER_SUGGEST_RE = /^\/v1\/organizations\/([^/]+)\/players\/suggest-position$/;
const ORG_PLAYER_ID_RE = /^\/v1\/organizations\/([^/]+)\/players\/([^/]+)$/;
const ORG_ROSTER_SUMMARY_RE = /^\/v1\/organizations\/([^/]+)\/roster\/summary$/;
const ORG_DRAFT_RE = /^\/v1\/organizations\/([^/]+)\/draft$/;
const ORG_MATCHES_RE = /^\/v1\/organizations\/([^/]+)\/matches$/;
const ORG_MATCH_SHARE_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/share$/;
const ORG_MATCH_ID_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)$/;
const ORG_AVAILABILITY_RE = /^\/v1\/organizations\/([^/]+)\/availability$/;
const ORG_AVAILABILITY_PLAYER_RE = /^\/v1\/organizations\/([^/]+)\/availability\/([^/]+)$/;

function unauthenticated(requestId: string): Response {
  return errorResponse("unauthenticated", "Authentication required", 401, requestId);
}

export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestId = resolveRequestId(request);

  try {
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env, requestId);
    }

    // ── Roster: suggest-position (fixed segment; must precede /players/:id) ──
    const suggestMatch = url.pathname.match(ORG_PLAYER_SUGGEST_RE);
    if (suggestMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(suggestMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleSuggestPosition(request, env, requestId, actor, orgUuid);
    }

    // ── Roster: collection ──
    const playersMatch = url.pathname.match(ORG_PLAYERS_RE);
    if (playersMatch) {
      const orgUuid = parseOrgPublicId(playersMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "POST") return handleCreatePlayer(request, env, requestId, actor, orgUuid);
      if (request.method === "GET") return handleListPlayers(request, env, requestId, actor, orgUuid);
      return methodNotAllowed(requestId);
    }

    // ── Roster: single player ──
    const playerIdMatch = url.pathname.match(ORG_PLAYER_ID_RE);
    if (playerIdMatch) {
      const orgUuid = parseOrgPublicId(playerIdMatch[1]!);
      const playerUuid = parsePlayerPublicId(playerIdMatch[2]!);
      if (!orgUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "GET") return handleGetPlayer(env, requestId, actor, orgUuid, playerUuid);
      if (request.method === "PATCH") return handleUpdatePlayer(request, env, requestId, actor, orgUuid, playerUuid);
      if (request.method === "DELETE") return handleArchivePlayer(env, requestId, actor, orgUuid, playerUuid);
      return methodNotAllowed(requestId);
    }

    // ── Roster summary ──
    const summaryMatch = url.pathname.match(ORG_ROSTER_SUMMARY_RE);
    if (summaryMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(summaryMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleRosterSummary(env, requestId, actor, orgUuid);
    }

    // ── Draft (stateless compute) ──
    const draftMatch = url.pathname.match(ORG_DRAFT_RE);
    if (draftMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(draftMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleDraft(request, env, requestId, actor, orgUuid);
    }

    // ── Fixtures: share (fixed segment; must precede /matches/:id) ──
    const shareMatch = url.pathname.match(ORG_MATCH_SHARE_RE);
    if (shareMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(shareMatch[1]!);
      const matchUuid = parseMatchPublicId(shareMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleShareMatch(env, requestId, actor, orgUuid, matchUuid);
    }

    // ── Fixtures: collection ──
    const matchesMatch = url.pathname.match(ORG_MATCHES_RE);
    if (matchesMatch) {
      const orgUuid = parseOrgPublicId(matchesMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "POST") return handleCreateMatch(request, env, requestId, actor, orgUuid);
      if (request.method === "GET") return handleListMatches(request, env, requestId, actor, orgUuid);
      return methodNotAllowed(requestId);
    }

    // ── Fixtures: single match ──
    const matchIdMatch = url.pathname.match(ORG_MATCH_ID_RE);
    if (matchIdMatch) {
      const orgUuid = parseOrgPublicId(matchIdMatch[1]!);
      const matchUuid = parseMatchPublicId(matchIdMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "GET") return handleGetMatch(env, requestId, actor, orgUuid, matchUuid);
      if (request.method === "PATCH") return handleUpdateMatch(request, env, requestId, actor, orgUuid, matchUuid);
      if (request.method === "DELETE") return handleCancelMatch(env, requestId, actor, orgUuid, matchUuid);
      return methodNotAllowed(requestId);
    }

    // ── Availability: single player (fixed segment; must precede collection is n/a) ──
    const availPlayerMatch = url.pathname.match(ORG_AVAILABILITY_PLAYER_RE);
    if (availPlayerMatch) {
      if (request.method !== "PUT") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(availPlayerMatch[1]!);
      const playerUuid = parsePlayerPublicId(availPlayerMatch[2]!);
      if (!orgUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleSetAvailability(request, env, requestId, actor, orgUuid, playerUuid);
    }

    // ── Availability: collection ──
    const availMatch = url.pathname.match(ORG_AVAILABILITY_RE);
    if (availMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(availMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleListAvailability(env, requestId, actor, orgUuid);
    }

    return notFound(requestId, url.pathname);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  }
}
