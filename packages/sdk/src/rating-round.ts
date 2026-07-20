import type { Transport, RequestOptions } from "./transport.js";

function orgBase(orgId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}`;
}

// ── v5: Rating Window v2 (deadline + settled results) ────────────────────
//
// Mirrors the poll widening in `./polls.js`: `@saas/contracts/matchmaker`
// still has the pre-v2 rating-round shapes (`PublicRatingRound` has no
// deadline; `GetRatingRoundResponse` is just `{ round }`). Rather than widen
// the shared contract, this file layers the v2 fields locally — the old
// shapes (and `RosterClient.getRatingRound`/`openRatingRound`/
// `closeRatingRound`, which still hit the same endpoints) are untouched, so
// existing callers keep compiling. See docs/design/rondo-rating-window-spec.md.

export type RatingRoundDeadlineKind = "24h" | "48h" | "manual";
export type RatingRoundV2Status = "open" | "closed";

export interface PublicRatingRoundV2 {
  id: string;
  status: RatingRoundV2Status;
  openedAt: string;
  closedAt: string | null;
  deadlineKind: RatingRoundDeadlineKind;
  deadlineAt: string | null;
}

/** One player's settled OVR movement for the latest closed round. */
export interface RatingRoundResultEntry {
  playerId: string;
  ovrBefore: number;
  ovrAfter: number;
  delta: number;
  votesReceived: number;
}

export interface OpenRatingRoundV2Request {
  deadline?: RatingRoundDeadlineKind;
  /** When true, reset every player to an equal baseline OVR and clear votes. */
  resetScores?: boolean;
}

export interface OpenRatingRoundV2Response {
  round: PublicRatingRoundV2;
}

export interface CloseRatingRoundV2Response {
  round: PublicRatingRoundV2;
}

/**
 * GET /rating-round: the window's live state plus the latest closed round's
 * settled deltas. `results` is absent when no round has ever closed.
 */
export interface GetRatingRoundV2Response {
  status: RatingRoundV2Status;
  deadlineKind: RatingRoundDeadlineKind;
  deadlineAt: string | null;
  closedAt: string | null;
  /** Distinct players rated so far this window (or in the last closed window). */
  ratedCount: number;
  /** Active players eligible to be rated. */
  eligible: number;
  results?: RatingRoundResultEntry[];
}

/**
 * Rating-round resource client (Rating Window v2) — deadline-aware open/close
 * plus settled per-player results. Org-scoped; maps to `apps/matchmaker-worker`
 * via the api-edge `matchmaker-facade` route (same endpoints as
 * `RosterClient`'s rating-round methods, typed to the wider v2 shapes).
 */
export class RatingRoundClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/rating-round — any member. */
  get(orgId: string, opts: RequestOptions = {}): Promise<GetRatingRoundV2Response> {
    return this.transport.request<GetRatingRoundV2Response>(
      { method: "GET", path: `${orgBase(orgId)}/rating-round` },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/rating-round/open — manager only. */
  open(orgId: string, body: OpenRatingRoundV2Request = {}, opts: RequestOptions = {}): Promise<OpenRatingRoundV2Response> {
    return this.transport.request<OpenRatingRoundV2Response>(
      { method: "POST", path: `${orgBase(orgId)}/rating-round/open`, body },
      opts,
    );
  }

  /** POST /v1/organizations/:orgId/rating-round/close — manager only; settles scores. */
  close(orgId: string, opts: RequestOptions = {}): Promise<CloseRatingRoundV2Response> {
    return this.transport.request<CloseRatingRoundV2Response>(
      { method: "POST", path: `${orgBase(orgId)}/rating-round/close` },
      opts,
    );
  }
}
