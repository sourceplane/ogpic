import type {
  ArchivePlayerResponse,
  CreatePlayerRequest,
  CreatePlayerResponse,
  ClaimPlayerResponse,
  GetMyPlayerResponse,
  ListMatchPaymentsResponse,
  SetMatchPaymentRequest,
  SetMatchPaymentResponse,
  DraftedPlayer,
  DraftRequest,
  DraftResponse,
  GetPlayerResponse,
  ListPlayersResponse,
  MatchShareResponse,
  MatchStatus as ContractsMatchStatus,
  MatchVenueInput,
  PlayerPosition,
  PublicMatch as ContractsPublicMatch,
  RosterSummaryResponse,
  SetCaptainResponse,
  SuggestPositionRequest,
  SuggestPositionResponse,
  UpdatePlayerRequest,
  UpdatePlayerResponse,
  ListAvailabilityResponse,
  SetAvailabilityRequest,
  SetAvailabilityResponse,
  CastVotesRequest,
  CastVotesResponse,
  GetVotesResponse,
  GetRatingRoundResponse,
  OpenRatingRoundRequest,
  RatingRoundResponse,
} from "@saas/contracts/matchmaker";

import type { Transport, RequestOptions } from "./transport.js";

function orgBase(orgId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}`;
}

// ── v5: poll → finalizing → draft → scheduled → live → played | cancelled ──
//
// `@saas/contracts/matchmaker` predates the v5 night-pitch redesign and only
// knows the post-schedule statuses. Rather than widen that shared contract
// (out of scope here — owned by the backend work item), this file layers the
// wider status/match/create-request shapes locally; existing (non-poll)
// callers are unaffected since the widened types are structural supersets.
// See docs/design/rondo-v5-spec.md §3-4.

export type MatchPollDeadlineKind = "24h" | "48h" | "manual";

export interface MatchPollTimeInput {
  label: string;
  startsAt?: string;
}

export interface MatchPollTurfInput {
  label: string;
  detail?: string;
}

/** The `poll` block of an extended create-match request (spec §4). */
export interface CreateMatchPollInput {
  times: MatchPollTimeInput[];
  turfs: MatchPollTurfInput[];
  deadline: MatchPollDeadlineKind;
}

/** v5 match lifecycle: adds the pre-schedule poll phases to the contract's
 *  post-schedule statuses. */
export type MatchStatus = ContractsMatchStatus | "poll" | "finalizing" | "draft";

/** `PublicMatch` widened to the v5 `status` union. */
export interface PublicMatch extends Omit<ContractsPublicMatch, "status"> {
  status: MatchStatus;
}

/**
 * Schedule a fixture from a chosen draft, or (v5) start a match poll instead:
 * with `poll`, `scheduledAt`/`teamA`/`teamB` are optional — the server
 * requires either `scheduledAt` or a poll time option with `startsAt`, and
 * teams are drafted after the poll finalizes.
 */
export interface CreateMatchRequest {
  scheduledAt?: string;
  format?: string;
  teamA?: { name: string; players: DraftedPlayer[] };
  teamB?: { name: string; players: DraftedPlayer[] };
  venue?: MatchVenueInput;
  poll?: CreateMatchPollInput;
}

export interface CreateMatchResponse {
  match: PublicMatch;
}

/** Reschedule, record a result, change status, set the venue, or edit the
 *  line-ups. All optional; teamA and teamB must be supplied together. */
export interface UpdateMatchRequest {
  scheduledAt?: string;
  status?: MatchStatus;
  scoreA?: number;
  scoreB?: number;
  venue?: MatchVenueInput;
  teamA?: { name: string; players: DraftedPlayer[] };
  teamB?: { name: string; players: DraftedPlayer[] };
}

export interface UpdateMatchResponse {
  match: PublicMatch;
}

export interface GetMatchResponse {
  match: PublicMatch;
}

export interface ListMatchesResponse {
  matches: PublicMatch[];
}

export interface CancelMatchResponse {
  match: PublicMatch;
}

/**
 * Roster (players) resource client — the shared player pool.
 *
 * Org-scoped: every method takes `orgId` as the first argument. Maps to
 * `apps/matchmaker-worker` via the api-edge `matchmaker-facade` route.
 */
export class RosterClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/players */
  list(orgId: string, opts: RequestOptions & { position?: PlayerPosition } = {}): Promise<ListPlayersResponse> {
    const query = opts.position ? `?position=${encodeURIComponent(opts.position)}` : "";
    return this.transport.request<ListPlayersResponse>(
      { method: "GET", path: `${orgBase(orgId)}/players${query}` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/players/:playerId */
  get(orgId: string, playerId: string, opts: RequestOptions = {}): Promise<GetPlayerResponse> {
    return this.transport.request<GetPlayerResponse>(
      { method: "GET", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/players */
  scout(orgId: string, body: CreatePlayerRequest, opts: RequestOptions = {}): Promise<CreatePlayerResponse> {
    return this.transport.request<CreatePlayerResponse>(
      { method: "POST", path: `${orgBase(orgId)}/players`, body },
      opts,
    );
  }

  /** PATCH /v1/organizations/:orgId/players/:playerId */
  update(
    orgId: string,
    playerId: string,
    body: UpdatePlayerRequest,
    opts: RequestOptions = {},
  ): Promise<UpdatePlayerResponse> {
    return this.transport.request<UpdatePlayerResponse>(
      { method: "PATCH", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}`, body },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/players/mine — the caller's claimed player (or null). */
  mine(orgId: string, opts: RequestOptions = {}): Promise<GetMyPlayerResponse> {
    return this.transport.request<GetMyPlayerResponse>(
      { method: "GET", path: `${orgBase(orgId)}/players/mine` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/players/:playerId/claim — claim a player as yourself. */
  claim(orgId: string, playerId: string, opts: RequestOptions = {}): Promise<ClaimPlayerResponse> {
    return this.transport.request<ClaimPlayerResponse>(
      { method: "POST", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}/claim` },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/players/mine/claim — "claim mine": server
   * resolves an unclaimed roster player matching the caller's email, or mints
   * one, and claims it. Idempotent if the caller already has a claimed player.
   */
  claimMine(orgId: string, opts: RequestOptions = {}): Promise<ClaimPlayerResponse> {
    return this.transport.request<ClaimPlayerResponse>(
      { method: "POST", path: `${orgBase(orgId)}/players/mine/claim` },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/players/:playerId (soft archive) */
  release(orgId: string, playerId: string, opts: RequestOptions = {}): Promise<ArchivePlayerResponse> {
    return this.transport.request<ArchivePlayerResponse>(
      { method: "DELETE", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/roster/summary */
  summary(orgId: string, opts: RequestOptions = {}): Promise<RosterSummaryResponse> {
    return this.transport.request<RosterSummaryResponse>(
      { method: "GET", path: `${orgBase(orgId)}/roster/summary` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/players/suggest-position */
  suggestPosition(
    orgId: string,
    body: SuggestPositionRequest,
    opts: RequestOptions = {},
  ): Promise<SuggestPositionResponse> {
    return this.transport.request<SuggestPositionResponse>(
      { method: "POST", path: `${orgBase(orgId)}/players/suggest-position`, body },
      opts,
    );
  }

  /** PUT /v1/organizations/:orgId/players/:playerId/captain — make this player the captain */
  setCaptain(orgId: string, playerId: string, opts: RequestOptions = {}): Promise<SetCaptainResponse> {
    return this.transport.request<SetCaptainResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}/captain` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/players/:playerId/votes — caller's votes + community stats */
  getVotes(orgId: string, playerId: string, opts: RequestOptions = {}): Promise<GetVotesResponse> {
    return this.transport.request<GetVotesResponse>(
      { method: "GET", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}/votes` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/players/:playerId/votes — rate a teammate's skills */
  castVotes(
    orgId: string,
    playerId: string,
    body: CastVotesRequest,
    opts: RequestOptions = {},
  ): Promise<CastVotesResponse> {
    return this.transport.request<CastVotesResponse>(
      { method: "POST", path: `${orgBase(orgId)}/players/${encodeURIComponent(playerId)}/votes`, body },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/rating-round — the open voting window (or null). */
  getRatingRound(orgId: string, opts: RequestOptions = {}): Promise<GetRatingRoundResponse> {
    return this.transport.request<GetRatingRoundResponse>(
      { method: "GET", path: `${orgBase(orgId)}/rating-round` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/rating-round/open — open a voting window (manager). */
  openRatingRound(orgId: string, body: OpenRatingRoundRequest = {}, opts: RequestOptions = {}): Promise<RatingRoundResponse> {
    return this.transport.request<RatingRoundResponse>(
      { method: "POST", path: `${orgBase(orgId)}/rating-round/open`, body },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/rating-round/close — close the voting window (manager). */
  closeRatingRound(orgId: string, opts: RequestOptions = {}): Promise<RatingRoundResponse> {
    return this.transport.request<RatingRoundResponse>(
      { method: "POST", path: `${orgBase(orgId)}/rating-round/close` },
      opts,
    );
  }
}

/**
 * Draft resource client — the stateless balancing engine.
 */
export class DraftClient {
  constructor(private readonly transport: Transport) {}

  /** POST /v1/organizations/:orgId/draft */
  run(orgId: string, body: DraftRequest = {}, opts: RequestOptions = {}): Promise<DraftResponse> {
    return this.transport.request<DraftResponse>(
      { method: "POST", path: `${orgBase(orgId)}/draft`, body },
      opts,
    );
  }
}

/**
 * Fixtures (matches) resource client.
 */
export class FixturesClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/matches */
  list(orgId: string, opts: RequestOptions = {}): Promise<ListMatchesResponse> {
    return this.transport.request<ListMatchesResponse>(
      { method: "GET", path: `${orgBase(orgId)}/matches` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/matches/:matchId */
  get(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<GetMatchResponse> {
    return this.transport.request<GetMatchResponse>(
      { method: "GET", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/matches */
  schedule(orgId: string, body: CreateMatchRequest, opts: RequestOptions = {}): Promise<CreateMatchResponse> {
    return this.transport.request<CreateMatchResponse>(
      { method: "POST", path: `${orgBase(orgId)}/matches`, body },
      opts,
    );
  }

  /** PATCH /v1/organizations/:orgId/matches/:matchId (reschedule / record result) */
  update(
    orgId: string,
    matchId: string,
    body: UpdateMatchRequest,
    opts: RequestOptions = {},
  ): Promise<UpdateMatchResponse> {
    return this.transport.request<UpdateMatchResponse>(
      { method: "PATCH", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}`, body },
      opts,
    );
  }

  /** DELETE /v1/organizations/:orgId/matches/:matchId (soft cancel) */
  cancel(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<CancelMatchResponse> {
    return this.transport.request<CancelMatchResponse>(
      { method: "DELETE", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/matches/:matchId/share */
  share(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<MatchShareResponse> {
    return this.transport.request<MatchShareResponse>(
      { method: "GET", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/share` },
      opts,
    );
  }

  /** GET /v1/organizations/:orgId/matches/:matchId/payments — pitch-fee ledger. */
  listPayments(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<ListMatchPaymentsResponse> {
    return this.transport.request<ListMatchPaymentsResponse>(
      { method: "GET", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/payments` },
      opts,
    );
  }

  /** PUT /v1/organizations/:orgId/matches/:matchId/payments/:playerId — set paid. */
  setPayment(orgId: string, matchId: string, playerId: string, body: SetMatchPaymentRequest, opts: RequestOptions = {}): Promise<SetMatchPaymentResponse> {
    return this.transport.request<SetMatchPaymentResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/payments/${encodeURIComponent(playerId)}`, body },
      opts,
    );
  }
}

/**
 * Availability resource client — per-player in/maybe/out for the next practice
 * match. Org-scoped; the draft picks from the `in` set.
 */
export class AvailabilityClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/availability */
  list(orgId: string, opts: RequestOptions = {}): Promise<ListAvailabilityResponse> {
    return this.transport.request<ListAvailabilityResponse>(
      { method: "GET", path: `${orgBase(orgId)}/availability` },
      opts,
    );
  }

  /** PUT /v1/organizations/:orgId/availability/:playerId */
  set(orgId: string, playerId: string, body: SetAvailabilityRequest, opts: RequestOptions = {}): Promise<SetAvailabilityResponse> {
    return this.transport.request<SetAvailabilityResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/availability/${encodeURIComponent(playerId)}`, body },
      opts,
    );
  }
}
