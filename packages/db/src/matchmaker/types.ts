export type { SqlExecutor, SqlExecutorResult, SqlRow } from "../hyperdrive/executor.js";
import type { Uuid } from "../ids/index.js";

export type MatchmakerRepositoryError =
  | { kind: "not_found" }
  | { kind: "conflict"; entity: string }
  | { kind: "internal"; message: string };

export type MatchmakerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: MatchmakerRepositoryError };

export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD" | "ALL";
export type PlayerStatus = "active" | "archived";
export type MatchStatus = "scheduled" | "played" | "cancelled";
export type AvailabilityState = "in" | "maybe" | "out";

export interface Availability {
  orgId: string;
  playerId: string;
  state: AvailabilityState;
  updatedAt: Date;
}

export interface Player {
  id: string;
  orgId: string;
  name: string;
  position: PlayerPosition;
  rating: number;
  attributes: Record<string, number>;
  status: PlayerStatus;
  isCaptain: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreatePlayerInput {
  id: string;
  orgId: Uuid;
  name: string;
  position: PlayerPosition;
  rating: number;
  attributes: Record<string, number>;
  createdAt: Date;
}

export interface UpdatePlayerInput {
  name: string;
  position: PlayerPosition;
  rating: number;
  attributes: Record<string, number>;
  updatedAt: Date;
}

/** A player snapshot as stored on a fixture team. */
export interface MatchTeamPlayer {
  id: string;
  name: string;
  position: PlayerPosition;
  rating: number;
}

export interface MatchTeamSnapshot {
  name: string;
  players: MatchTeamPlayer[];
  squadRating: number;
}

export interface Match {
  id: string;
  orgId: string;
  scheduledAt: Date;
  status: MatchStatus;
  format: string | null;
  teamA: MatchTeamSnapshot;
  teamB: MatchTeamSnapshot;
  ratingA: number;
  ratingB: number;
  scoreA: number | null;
  scoreB: number | null;
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMatchInput {
  id: string;
  orgId: Uuid;
  scheduledAt: Date;
  format: string | null;
  teamA: MatchTeamSnapshot;
  teamB: MatchTeamSnapshot;
  ratingA: number;
  ratingB: number;
  shareToken: string;
  createdAt: Date;
}

export interface UpdateMatchInput {
  scheduledAt: Date | null;
  status: MatchStatus | null;
  scoreA: number | null;
  scoreB: number | null;
  updatedAt: Date;
}

export interface CursorPosition {
  createdAt: string;
  id: string;
}

/** Fixtures paginate on scheduled_at, not created_at. */
export interface MatchCursorPosition {
  scheduledAt: string;
  id: string;
}

export interface PageQueryParams {
  limit: number;
  cursor: CursorPosition | null;
}

export interface MatchPageQueryParams {
  limit: number;
  cursor: MatchCursorPosition | null;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: CursorPosition | null;
}

export interface MatchPagedResult<T> {
  items: T[];
  nextCursor: MatchCursorPosition | null;
}

export interface PositionCount {
  position: PlayerPosition;
  count: number;
  averageRating: number;
}

/** A single member's star rating (1-5) of a player on one named skill. */
export interface PlayerVote {
  skill: string;
  stars: number;
}

/** Aggregate community sentiment for a player: distinct voters + mean stars. */
export interface PlayerVoteStats {
  playerId: string;
  voterCount: number;
  /** Mean of every stored star row for the player (0 when there are no votes). */
  avgStars: number;
}

export interface CastVotesInput {
  orgId: Uuid;
  playerId: Uuid;
  voterId: string;
  votes: PlayerVote[];
  now: Date;
}

export interface MatchmakerRepository {
  createPlayer(input: CreatePlayerInput): Promise<MatchmakerResult<Player>>;
  getPlayerById(orgId: Uuid, playerId: Uuid): Promise<MatchmakerResult<Player>>;
  updatePlayer(orgId: Uuid, playerId: Uuid, input: UpdatePlayerInput): Promise<MatchmakerResult<Player>>;
  archivePlayer(orgId: Uuid, playerId: Uuid, archivedAt: Date): Promise<MatchmakerResult<Player>>;
  /** Make `playerId` the sole captain of the org (clears any other captain). */
  setCaptain(orgId: Uuid, playerId: Uuid, now: Date): Promise<MatchmakerResult<Player>>;
  listPlayersPaged(
    orgId: Uuid,
    params: PageQueryParams,
    position: PlayerPosition | null,
  ): Promise<MatchmakerResult<PagedResult<Player>>>;
  /** All active players for an org (used by the draft engine). */
  listActivePlayers(orgId: Uuid): Promise<MatchmakerResult<Player[]>>;
  /** Active players in an explicit id set (used by a filtered draft). */
  listActivePlayersByIds(orgId: Uuid, ids: Uuid[]): Promise<MatchmakerResult<Player[]>>;
  rosterSummary(orgId: Uuid): Promise<MatchmakerResult<PositionCount[]>>;

  createMatch(input: CreateMatchInput): Promise<MatchmakerResult<Match>>;
  getMatchById(orgId: Uuid, matchId: Uuid): Promise<MatchmakerResult<Match>>;
  updateMatch(orgId: Uuid, matchId: Uuid, input: UpdateMatchInput): Promise<MatchmakerResult<Match>>;
  listMatchesPaged(orgId: Uuid, params: MatchPageQueryParams): Promise<MatchmakerResult<MatchPagedResult<Match>>>;

  listAvailability(orgId: Uuid): Promise<MatchmakerResult<Availability[]>>;
  setAvailability(
    orgId: Uuid,
    playerId: Uuid,
    state: AvailabilityState,
    now: Date,
  ): Promise<MatchmakerResult<Availability>>;

  /** Upsert a member's per-skill star votes for a player (re-voting replaces). */
  castPlayerVotes(input: CastVotesInput): Promise<MatchmakerResult<void>>;
  /** The calling member's own current votes for a player (to prefill the sheet). */
  getVoterVotes(orgId: Uuid, playerId: Uuid, voterId: string): Promise<MatchmakerResult<PlayerVote[]>>;
  /** Aggregate community sentiment for a single player. */
  getPlayerVoteStats(orgId: Uuid, playerId: Uuid): Promise<MatchmakerResult<PlayerVoteStats>>;
  /** Aggregate community sentiment for every voted player in the org. */
  listPlayerVoteStats(orgId: Uuid): Promise<MatchmakerResult<PlayerVoteStats[]>>;
}
