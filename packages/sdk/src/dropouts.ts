import type { PublicMatch } from "./matchmaker.js";
import type { Transport, RequestOptions } from "./transport.js";

function orgBase(orgId: string): string {
  return `/v1/organizations/${encodeURIComponent(orgId)}`;
}

export interface PublicMatchDropout {
  matchId: string;
  playerId: string;
  reason: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface SetDropoutRequest {
  reason: string;
}

export interface SetDropoutResponse {
  dropout: PublicMatchDropout;
}

export interface UndoDropoutResponse {
  dropout: PublicMatchDropout;
}

export interface ResolveDropoutRequest {
  /** Slot the replacement into the dropped player's spot in team_a/team_b. */
  replacementPlayerId?: string;
}

export interface ResolveDropoutResponse {
  dropout: PublicMatchDropout;
  /** The updated match when a replacement was swapped in, else `null`. */
  match: PublicMatch | null;
}

/**
 * Match dropout resource client — a player pulling out of a scheduled/draft
 * match, and a manager resolving it with or without a replacement
 * (docs/design/rondo-v5-spec.md §4 Dropouts). Org-scoped, match-scoped.
 */
export interface ListDropoutsResponse {
  dropouts: PublicMatchDropout[];
}

export class DropoutsClient {
  constructor(private readonly transport: Transport) {}

  /** GET /v1/organizations/:orgId/matches/:matchId/dropouts — list a match's dropouts. */
  listDropouts(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<ListDropoutsResponse> {
    return this.transport.request<ListDropoutsResponse>(
      { method: "GET", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/dropouts` },
      opts,
    );
  }

  /** PUT /v1/organizations/:orgId/matches/:matchId/dropout — self-service. */
  setDropout(
    orgId: string,
    matchId: string,
    body: SetDropoutRequest,
    opts: RequestOptions = {},
  ): Promise<SetDropoutResponse> {
    return this.transport.request<SetDropoutResponse>(
      { method: "PUT", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/dropout`, body },
      opts,
    );
  }

  /**
   * DELETE /v1/organizations/:orgId/matches/:matchId/dropout — self-service:
   * undo the caller's own dropout while it's still unresolved.
   */
  undoDropout(orgId: string, matchId: string, opts: RequestOptions = {}): Promise<UndoDropoutResponse> {
    return this.transport.request<UndoDropoutResponse>(
      { method: "DELETE", path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/dropout` },
      opts,
    );
  }

  /**
   * POST /v1/organizations/:orgId/matches/:matchId/dropouts/:playerId/resolve
   * Manager only. With `replacementPlayerId`, swaps the replacement into the
   * dropped player's slot; without it, just marks the dropout resolved.
   */
  resolveDropout(
    orgId: string,
    matchId: string,
    playerId: string,
    body: ResolveDropoutRequest = {},
    opts: RequestOptions = {},
  ): Promise<ResolveDropoutResponse> {
    return this.transport.request<ResolveDropoutResponse>(
      {
        method: "POST",
        path: `${orgBase(orgId)}/matches/${encodeURIComponent(matchId)}/dropouts/${encodeURIComponent(playerId)}/resolve`,
        body,
      },
      opts,
    );
  }
}
