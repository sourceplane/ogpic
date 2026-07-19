export type { SqlExecutor, SqlExecutorResult, SqlRow } from "../hyperdrive/executor.js";
import type { Uuid } from "../ids/index.js";

export type MatchmakerRepositoryError =
  | { kind: "not_found" }
  | { kind: "conflict"; entity: string }
  | { kind: "validation"; message: string }
  | { kind: "internal"; message: string };

export type MatchmakerResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: MatchmakerRepositoryError };

export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD" | "ALL";
export type PlayerStatus = "active" | "archived";
// v5: matches start life as a poll, get finalized, then drafted, before the
// pre-existing scheduled/live/played/cancelled lifecycle takes over.
export type MatchStatus = "poll" | "finalizing" | "draft" | "scheduled" | "live" | "played" | "cancelled";
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
  email: string | null;
  phone: string | null;
  status: PlayerStatus;
  isCaptain: boolean;
  /** Auth subject that claimed this player (self-service availability); NULL = unclaimed. */
  subjectId: string | null;
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
  email: string | null;
  phone: string | null;
  createdAt: Date;
}

export interface UpdatePlayerInput {
  name: string;
  position: PlayerPosition;
  rating: number;
  attributes: Record<string, number>;
  /** The resolved contact email (merged with the existing value), always written. */
  email: string | null;
  /** The resolved contact phone (merged with the existing value), always written. */
  phone: string | null;
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

/** Where a practice match is played. `booked` marks a secured pitch. */
export interface MatchVenue {
  name: string | null;
  address: string | null;
  booked: boolean;
  /** Google Maps location (URL or "lat,lng") players can tap to navigate. */
  mapsUrl: string | null;
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
  venue: MatchVenue;
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
  venue: MatchVenue;
  shareToken: string;
  createdAt: Date;
}

export interface UpdateMatchInput {
  scheduledAt: Date | null;
  status: MatchStatus | null;
  scoreA: number | null;
  scoreB: number | null;
  /** When present, replaces the whole venue; null leaves it unchanged. */
  venue: MatchVenue | null;
  /** When present, replaces both line-ups (edit a scheduled fixture's teams). */
  teamA: MatchTeamSnapshot | null;
  teamB: MatchTeamSnapshot | null;
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

/** A per-match payment ledger row: has this player paid for the pitch? */
export interface MatchPayment {
  orgId: string;
  matchId: string;
  playerId: string;
  paid: boolean;
  updatedAt: Date;
}

export type RatingRoundStatus = "open" | "closed";

/** A manager-gated voting window. At most one is open per org at a time. */
export interface RatingRound {
  id: string;
  orgId: string;
  status: RatingRoundStatus;
  openedBy: string;
  openedAt: Date;
  closedAt: Date | null;
}

// ── Match polls (v5) ─────────────────────────────────────────────
// The manager posts candidate times/turfs, players vote on all that work, the
// poll closes (deadline or manually), then the manager finalizes the winning
// slot. One poll per match.

export type PollDeadlineKind = "24h" | "48h" | "manual";
export type PollOptionKind = "time" | "turf";

export interface MatchPoll {
  matchId: string;
  orgId: string;
  deadlineKind: PollDeadlineKind;
  deadlineAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchPollOption {
  id: string;
  matchId: string;
  orgId: string;
  kind: PollOptionKind;
  label: string;
  detail: string | null;
  startsAt: Date | null;
  position: number;
  createdAt: Date;
}

/** A poll option annotated with every player who voted for it. */
export interface MatchPollOptionWithVotes extends MatchPollOption {
  voterPlayerIds: string[];
}

export interface MatchPollVote {
  optionId: string;
  matchId: string;
  orgId: string;
  playerId: string;
  createdAt: Date;
}

/** The full poll: header row plus every option and its voters. */
export interface MatchPollDetail {
  poll: MatchPoll;
  options: MatchPollOptionWithVotes[];
}

export interface CreateMatchPollOptionInput {
  id: string;
  kind: PollOptionKind;
  label: string;
  detail: string | null;
  startsAt: Date | null;
  position: number;
}

export interface CreateMatchPollInput {
  matchId: Uuid;
  orgId: Uuid;
  deadlineKind: PollDeadlineKind;
  deadlineAt: Date | null;
  options: CreateMatchPollOptionInput[];
}

// ── Dropouts (v5) ────────────────────────────────────────────────
// A confirmed player pulling out of a scheduled match; resolved when the
// manager replaces them or adjusts teams manually.

export interface MatchDropout {
  matchId: string;
  orgId: string;
  playerId: string;
  reason: string;
  resolvedAt: Date | null;
  createdAt: Date;
}

// ── Org settings (v5) ────────────────────────────────────────────

export interface OrgSettings {
  orgId: string;
  whatsappBridge: boolean;
  updatedAt: Date;
}

export interface SetOrgSettingsInput {
  whatsappBridge: boolean;
}

// ── Chat (v5) ────────────────────────────────────────────────────
// One squad-wide stream per org. Human messages ('text'), system pills
// ('note'), and structural cards referencing a match ('poll', 'sched').

export type ChatMessageKind = "text" | "note" | "poll" | "sched";

export interface ChatMessage {
  id: string;
  orgId: string;
  kind: ChatMessageKind;
  body: string;
  matchId: string | null;
  authorPlayerId: string | null;
  authorSubjectId: string | null;
  authorName: string | null;
  /** Emoji -> distinct subject ids who reacted with it. */
  reactions: Record<string, string[]>;
  createdAt: Date;
}

export interface InsertChatMessageInput {
  id: string;
  orgId: Uuid;
  kind: ChatMessageKind;
  body: string;
  matchId: string | null;
  authorPlayerId: string | null;
  authorSubjectId: string | null;
  authorName: string | null;
  createdAt: Date;
}

export interface ListChatMessagesParams {
  limit: number;
  before: Date | null;
  /** Tie-breaker for `before` when paging past messages with identical
   *  `created_at`: pairs with `before` for a `(created_at, id) < (…)` keyset
   *  comparison. Ignored if `before` isn't also set. */
  beforeId?: string | null;
}

export interface MatchmakerRepository {
  createPlayer(input: CreatePlayerInput): Promise<MatchmakerResult<Player>>;
  getPlayerById(orgId: Uuid, playerId: Uuid): Promise<MatchmakerResult<Player>>;
  updatePlayer(orgId: Uuid, playerId: Uuid, input: UpdatePlayerInput): Promise<MatchmakerResult<Player>>;
  archivePlayer(orgId: Uuid, playerId: Uuid, archivedAt: Date): Promise<MatchmakerResult<Player>>;
  /** Make `playerId` the sole captain of the org (clears any other captain). */
  setCaptain(orgId: Uuid, playerId: Uuid, now: Date): Promise<MatchmakerResult<Player>>;
  /** Claim an unclaimed player for a subject (self-service). Conflict if the
   *  player is already claimed or the subject already owns another player. */
  claimPlayer(orgId: Uuid, playerId: Uuid, subjectId: string, now: Date): Promise<MatchmakerResult<Player>>;
  /** The player a subject has claimed in this org, or not_found when none. */
  getPlayerBySubject(orgId: Uuid, subjectId: string): Promise<MatchmakerResult<Player>>;
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
  /** System cron: flip every scheduled fixture whose kickoff time has passed to
   *  'live' (all orgs). Returns the number transitioned. */
  startDueMatches(now: Date): Promise<MatchmakerResult<number>>;
  /** System cron: scheduled fixtures (all orgs) kicking off within [from, to],
   *  used to send availability reminders. */
  listScheduledMatchesInWindow(from: Date, to: Date): Promise<MatchmakerResult<Match[]>>;
  listMatchesPaged(orgId: Uuid, params: MatchPageQueryParams): Promise<MatchmakerResult<MatchPagedResult<Match>>>;

  /** All payment rows for a match (who has paid for the pitch). */
  listMatchPayments(orgId: Uuid, matchId: Uuid): Promise<MatchmakerResult<MatchPayment[]>>;
  /** Upsert a player's paid flag for a match. */
  setMatchPayment(orgId: Uuid, matchId: Uuid, playerId: Uuid, paid: boolean, now: Date): Promise<MatchmakerResult<MatchPayment>>;

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

  /** The org's currently-open rating round, or null when voting is closed. */
  getOpenRatingRound(orgId: Uuid): Promise<MatchmakerResult<RatingRound | null>>;
  /** Open a rating round (conflict if one is already open). */
  openRatingRound(id: string, orgId: Uuid, openedBy: string, now: Date): Promise<MatchmakerResult<RatingRound>>;
  /** Close the org's open rating round (not_found when none is open). */
  closeRatingRound(orgId: Uuid, now: Date): Promise<MatchmakerResult<RatingRound>>;
  /** Reset every active player to an equal baseline OVR and clear all votes. */
  resetScoresToBaseline(orgId: Uuid, baseline: number, now: Date): Promise<MatchmakerResult<void>>;

  /** Create a match's poll header + options (conflict if the match already has one). */
  createMatchPoll(input: CreateMatchPollInput, now: Date): Promise<MatchmakerResult<MatchPollDetail>>;
  /** The poll, its options, and every option's voters. */
  getMatchPoll(orgId: Uuid, matchId: Uuid): Promise<MatchmakerResult<MatchPollDetail>>;
  /** Atomically replace a player's ballot for the match. `optionIds` may be
   *  empty (clears the vote). Validation error when an id doesn't belong to
   *  this match's poll. */
  setPollVotes(
    orgId: Uuid,
    matchId: Uuid,
    playerId: Uuid,
    optionIds: string[],
    now: Date,
  ): Promise<MatchmakerResult<void>>;
  /** Close the poll (conflict if it's already closed). */
  closeMatchPoll(orgId: Uuid, matchId: Uuid, now: Date): Promise<MatchmakerResult<MatchPoll>>;
  /** System cron (all orgs): open polls whose deadline has passed. */
  listDuePolls(now: Date, limit: number): Promise<MatchmakerResult<MatchPoll[]>>;

  /** Upsert a player's dropout for a match (reopens it if previously resolved). */
  upsertDropout(
    orgId: Uuid,
    matchId: Uuid,
    playerId: Uuid,
    reason: string,
    now: Date,
  ): Promise<MatchmakerResult<MatchDropout>>;
  /** Undo a dropout while it's still unresolved (not_found otherwise). */
  deleteDropout(orgId: Uuid, matchId: Uuid, playerId: Uuid): Promise<MatchmakerResult<MatchDropout>>;
  /** Manager marks a dropout resolved (replaced or adjusted). */
  resolveDropout(orgId: Uuid, matchId: Uuid, playerId: Uuid, now: Date): Promise<MatchmakerResult<MatchDropout>>;
  listDropouts(orgId: Uuid, matchId: Uuid): Promise<MatchmakerResult<MatchDropout[]>>;
  /** Every unresolved dropout across the org's matches. */
  listOpenDropouts(orgId: Uuid): Promise<MatchmakerResult<MatchDropout[]>>;

  /** The org's settings row, or null when it has never been set. */
  getOrgSettings(orgId: Uuid): Promise<MatchmakerResult<OrgSettings | null>>;
  setOrgSettings(orgId: Uuid, input: SetOrgSettingsInput, now: Date): Promise<MatchmakerResult<OrgSettings>>;

  insertChatMessage(input: InsertChatMessageInput): Promise<MatchmakerResult<ChatMessage>>;
  /** Newest first, tenant-scoped, optionally paged by `before`. */
  listChatMessages(orgId: Uuid, params: ListChatMessagesParams): Promise<MatchmakerResult<ChatMessage[]>>;
  /** Toggle `subjectId`'s reaction on a message: adds it to reactions[emoji],
   *  or removes it (dropping the key when it empties out). */
  toggleChatReaction(
    orgId: Uuid,
    messageId: Uuid,
    emoji: string,
    subjectId: string,
  ): Promise<MatchmakerResult<ChatMessage>>;
}
