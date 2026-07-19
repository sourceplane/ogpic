import type { PublicMatch } from "./matchmaker.js";
import type { Transport, RequestOptions } from "./transport.js";

function orgBase(orgId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}`;
}

export type MatchPollDeadlineKind = "24h" | "48h" | "manual";
export type MatchPollOptionKind = "time" | "turf";

export interface PublicMatchPollOption {
  id: string;
  kind: MatchPollOptionKind;
  label: string;
  detail: string | null;
  startsAt: string | null;
  votes: number;
  voterPlayerIds: string[];
}

export interface PublicMatchPoll {
  deadlineKind: MatchPollDeadlineKind;
  deadlineAt: string | null;
  closedAt: string | null;
}

/** GET and PUT-votes share this shape (spec §4). */
export interface MatchPollResponse {
  poll: PublicMatchPoll;
  options: PublicMatchPollOption[];
  voters: string[];
  eligible: number;
}

export interface SetPollVotesRequest {
  optionIds: string[];
  /** Manager-only: cast votes on behalf of another roster player. */
  playerId?: string;
}

export interface FinalizeMatchRequest {
  timeOptionId: string;
  turfOptionId: string;
}

export interface ClosePollResponse {
  match: PublicMatch;
}

export interface FinalizeMatchResponse {
  match: PublicMatch;
}

/**
 * Match-poll resource client — the v5 "when can you play?" flow that
 * precedes scheduling (docs/design/rondo-v5-spec.md §4 Polls). Org-scoped,
 * match-scoped; maps to `apps/matchmaker-worker` via the api-edge
 * `matchmaker-facade` route.
 */
export class PollsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/matches/:matchId/poll — any member may view. */
  getMatchPoll(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<MatchPollResponse> {
    return this.transport.request<MatchPollResponse>(
      { method: "GET", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/poll` },
      opts,
    );
  }

  /**
   * PUT /v1/organizations/:orgId/matches/:matchId/poll/votes — self-service:
   * replaces the caller's ballot for this match. A manager may pass
   * `playerId` to vote on behalf of any roster player.
   */
  setPollVotes(
    orgId: string,
    matchId: string,
    body: SetPollVotesRequest,
    opts: RequestOptions = {},
  ): Promise<MatchPollResponse> {
    return this.transport.request<MatchPollResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/poll/votes`, body },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/matches/:matchId/poll/close — manager only. */
  closePoll(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<ClosePollResponse> {
    return this.transport.request<ClosePollResponse>(
      { method: "POST", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/poll/close` },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/matches/:matchId/finalize — manager only.
   * Picks the winning time/turf options and moves the match to `draft`.
   */
  finalizeMatch(
    orgId: string,
    matchId: string,
    body: FinalizeMatchRequest,
    opts: RequestOptions = {},
  ): Promise<FinalizeMatchResponse> {
    return this.transport.request<FinalizeMatchResponse>(
      { method: "POST", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/finalize`, body },
      opts,
    );
  }
}
