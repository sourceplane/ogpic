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
import { handleListMatchPayments, handleSetMatchPayment } from "./handlers/match-payments.js";
import { handleGetMatchPoll, handleSetPollVotes, handleClosePoll, handleFinalizeMatch } from "./handlers/match-polls.js";
import { handleSetDropout, handleUndoDropout, handleResolveDropout } from "./handlers/match-dropouts.js";
import { handleGetOrgSettings, handleSetOrgSettings } from "./handlers/org-settings.js";
import { handleChatList, handleChatPost, handleChatReact } from "./handlers/chat.js";
import { handleListAvailability } from "./handlers/list-availability.js";
import { handleSetAvailability } from "./handlers/set-availability.js";
import { handleSetCaptain } from "./handlers/set-captain.js";
import { handleClaimPlayer, handleGetMyPlayer } from "./handlers/claim-player.js";
import { handleCastVotes } from "./handlers/cast-votes.js";
import { handleGetVotes } from "./handlers/get-votes.js";
import { handleGetRatingRound, handleOpenRatingRound, handleCloseRatingRound } from "./handlers/rating-round.js";
import { errorResponse, notFound, methodNotAllowed } from "./http.js";
import { generateRequestId, parseOrgPublicId, parsePlayerPublicId, parseMatchPublicId, parseChatMessagePublicId } from "./ids.js";

const REQUEST_ID_RE = /^[\w-]{1,128}$/;

export interface ActorContext {
  subjectId: string;
  subjectType: string;
  /** Caller's email (forwarded by the edge). Used to verify a self-claim. */
  email?: string | null;
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
  return { subjectId, subjectType, email: request.headers.get("x-actor-email") };
}

const ORG_PLAYERS_RE = /^\/v1\/organizations\/([^/]+)\/players$/;
const ORG_PLAYER_SUGGEST_RE = /^\/v1\/organizations\/([^/]+)\/players\/suggest-position$/;
const ORG_PLAYER_CAPTAIN_RE = /^\/v1\/organizations\/([^/]+)\/players\/([^/]+)\/captain$/;
const ORG_PLAYER_MINE_RE = /^\/v1\/organizations\/([^/]+)\/players\/mine$/;
const ORG_PLAYER_CLAIM_RE = /^\/v1\/organizations\/([^/]+)\/players\/([^/]+)\/claim$/;
const ORG_PLAYER_VOTES_RE = /^\/v1\/organizations\/([^/]+)\/players\/([^/]+)\/votes$/;
const ORG_PLAYER_ID_RE = /^\/v1\/organizations\/([^/]+)\/players\/([^/]+)$/;
const ORG_ROSTER_SUMMARY_RE = /^\/v1\/organizations\/([^/]+)\/roster\/summary$/;
const ORG_RATING_ROUND_RE = /^\/v1\/organizations\/([^/]+)\/rating-round$/;
const ORG_RATING_ROUND_ACTION_RE = /^\/v1\/organizations\/([^/]+)\/rating-round\/(open|close)$/;
const ORG_DRAFT_RE = /^\/v1\/organizations\/([^/]+)\/draft$/;
const ORG_MATCHES_RE = /^\/v1\/organizations\/([^/]+)\/matches$/;
const ORG_MATCH_SHARE_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/share$/;
const ORG_MATCH_PAYMENTS_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/payments$/;
const ORG_MATCH_PAYMENT_PLAYER_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/payments\/([^/]+)$/;
const ORG_MATCH_POLL_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/poll$/;
const ORG_MATCH_POLL_VOTES_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/poll\/votes$/;
const ORG_MATCH_POLL_CLOSE_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/poll\/close$/;
const ORG_MATCH_FINALIZE_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/finalize$/;
const ORG_MATCH_DROPOUT_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/dropout$/;
const ORG_MATCH_DROPOUT_RESOLVE_RE = /^\/v1\/organizations\/([^/]+)\/matches\/([^/]+)\/dropouts\/([^/]+)\/resolve$/;
const ORG_CHAT_RE = /^\/v1\/organizations\/([^/]+)\/chat$/;
const ORG_CHAT_REACTIONS_RE = /^\/v1\/organizations\/([^/]+)\/chat\/([^/]+)\/reactions$/;
const ORG_SETTINGS_RE = /^\/v1\/organizations\/([^/]+)\/settings$/;
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

    // ── Roster: captain (fixed segment; must precede /players/:id) ──
    const captainMatch = url.pathname.match(ORG_PLAYER_CAPTAIN_RE);
    if (captainMatch) {
      if (request.method !== "PUT") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(captainMatch[1]!);
      const playerUuid = parsePlayerPublicId(captainMatch[2]!);
      if (!orgUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleSetCaptain(env, requestId, actor, orgUuid, playerUuid);
    }

    // ── Roster: self-claim (fixed segment; must precede /players/:id) ──
    const claimMatch = url.pathname.match(ORG_PLAYER_CLAIM_RE);
    if (claimMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(claimMatch[1]!);
      const playerUuid = parsePlayerPublicId(claimMatch[2]!);
      if (!orgUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleClaimPlayer(env, requestId, actor, orgUuid, playerUuid);
    }

    // ── Roster: the caller's own claimed player (precede /players/:id) ──
    const mineMatch = url.pathname.match(ORG_PLAYER_MINE_RE);
    if (mineMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(mineMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleGetMyPlayer(env, requestId, actor, orgUuid);
    }

    // ── Rating rounds (voting window: open/close by manager) ──
    const roundActionMatch = url.pathname.match(ORG_RATING_ROUND_ACTION_RE);
    if (roundActionMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(roundActionMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return roundActionMatch[2] === "open"
        ? handleOpenRatingRound(request, env, requestId, actor, orgUuid)
        : handleCloseRatingRound(env, requestId, actor, orgUuid);
    }
    const roundMatch = url.pathname.match(ORG_RATING_ROUND_RE);
    if (roundMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(roundMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleGetRatingRound(env, requestId, actor, orgUuid);
    }

    // ── Roster: votes (fixed segment; must precede /players/:id) ──
    const votesMatch = url.pathname.match(ORG_PLAYER_VOTES_RE);
    if (votesMatch) {
      const orgUuid = parseOrgPublicId(votesMatch[1]!);
      const playerUuid = parsePlayerPublicId(votesMatch[2]!);
      if (!orgUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "GET") return handleGetVotes(env, requestId, actor, orgUuid, playerUuid);
      if (request.method === "POST") return handleCastVotes(request, env, requestId, actor, orgUuid, playerUuid);
      return methodNotAllowed(requestId);
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

    // ── Fixtures: payments (fixed segment; must precede /matches/:id) ──
    const paymentPlayerMatch = url.pathname.match(ORG_MATCH_PAYMENT_PLAYER_RE);
    if (paymentPlayerMatch) {
      if (request.method !== "PUT") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(paymentPlayerMatch[1]!);
      const matchUuid = parseMatchPublicId(paymentPlayerMatch[2]!);
      const playerUuid = parsePlayerPublicId(paymentPlayerMatch[3]!);
      if (!orgUuid || !matchUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleSetMatchPayment(request, env, requestId, actor, orgUuid, matchUuid, playerUuid);
    }
    const paymentsMatch = url.pathname.match(ORG_MATCH_PAYMENTS_RE);
    if (paymentsMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(paymentsMatch[1]!);
      const matchUuid = parseMatchPublicId(paymentsMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleListMatchPayments(env, requestId, actor, orgUuid, matchUuid);
    }

    // ── Fixtures: polls / finalize / dropouts (fixed segments; precede /matches/:id) ──
    const pollVotesMatch = url.pathname.match(ORG_MATCH_POLL_VOTES_RE);
    if (pollVotesMatch) {
      if (request.method !== "PUT") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(pollVotesMatch[1]!);
      const matchUuid = parseMatchPublicId(pollVotesMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleSetPollVotes(request, env, requestId, actor, orgUuid, matchUuid);
    }
    const pollCloseMatch = url.pathname.match(ORG_MATCH_POLL_CLOSE_RE);
    if (pollCloseMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(pollCloseMatch[1]!);
      const matchUuid = parseMatchPublicId(pollCloseMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleClosePoll(env, requestId, actor, orgUuid, matchUuid);
    }
    const pollMatch = url.pathname.match(ORG_MATCH_POLL_RE);
    if (pollMatch) {
      if (request.method !== "GET") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(pollMatch[1]!);
      const matchUuid = parseMatchPublicId(pollMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleGetMatchPoll(env, requestId, actor, orgUuid, matchUuid);
    }
    const finalizeMatch = url.pathname.match(ORG_MATCH_FINALIZE_RE);
    if (finalizeMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(finalizeMatch[1]!);
      const matchUuid = parseMatchPublicId(finalizeMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleFinalizeMatch(request, env, requestId, actor, orgUuid, matchUuid);
    }
    const dropoutResolveMatch = url.pathname.match(ORG_MATCH_DROPOUT_RESOLVE_RE);
    if (dropoutResolveMatch) {
      if (request.method !== "POST") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(dropoutResolveMatch[1]!);
      const matchUuid = parseMatchPublicId(dropoutResolveMatch[2]!);
      const playerUuid = parsePlayerPublicId(dropoutResolveMatch[3]!);
      if (!orgUuid || !matchUuid || !playerUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleResolveDropout(request, env, requestId, actor, orgUuid, matchUuid, playerUuid);
    }
    const dropoutMatch = url.pathname.match(ORG_MATCH_DROPOUT_RE);
    if (dropoutMatch) {
      const orgUuid = parseOrgPublicId(dropoutMatch[1]!);
      const matchUuid = parseMatchPublicId(dropoutMatch[2]!);
      if (!orgUuid || !matchUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "PUT") return handleSetDropout(request, env, requestId, actor, orgUuid, matchUuid);
      if (request.method === "DELETE") return handleUndoDropout(env, requestId, actor, orgUuid, matchUuid);
      return methodNotAllowed(requestId);
    }

    // ── Team chat ──
    const chatReactionsMatch = url.pathname.match(ORG_CHAT_REACTIONS_RE);
    if (chatReactionsMatch) {
      if (request.method !== "PUT") return methodNotAllowed(requestId);
      const orgUuid = parseOrgPublicId(chatReactionsMatch[1]!);
      const messageUuid = parseChatMessagePublicId(chatReactionsMatch[2]!);
      if (!orgUuid || !messageUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      return handleChatReact(request, env, requestId, actor, orgUuid, messageUuid);
    }
    const chatMatch = url.pathname.match(ORG_CHAT_RE);
    if (chatMatch) {
      const orgUuid = parseOrgPublicId(chatMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "GET") return handleChatList(request, env, requestId, actor, orgUuid);
      if (request.method === "POST") return handleChatPost(request, env, requestId, actor, orgUuid);
      return methodNotAllowed(requestId);
    }

    // ── Org settings ──
    const settingsMatch = url.pathname.match(ORG_SETTINGS_RE);
    if (settingsMatch) {
      const orgUuid = parseOrgPublicId(settingsMatch[1]!);
      if (!orgUuid) return errorResponse("not_found", "Not found", 404, requestId);
      const actor = resolveActor(request);
      if (!actor) return unauthenticated(requestId);
      if (request.method === "GET") return handleGetOrgSettings(env, requestId, actor, orgUuid);
      if (request.method === "PUT") return handleSetOrgSettings(request, env, requestId, actor, orgUuid);
      return methodNotAllowed(requestId);
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
