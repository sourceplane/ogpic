// Matchmaker product contract types.
//
// Wire shapes for the `matchmaker` bounded context: the shared roster
// (players), the balancing draft (stateless compute), and fixtures (matches).
// All ids are public string ids (`plr_`/`mtc_`), dates are ISO strings.
//
// Convention mirrors `projects.ts`: `PublicX` (wire shape) + `CreateXRequest` /
// `XResponse` pairs. No zod — validation is hand-rolled in the worker.

/** Tactical position class. `ALL` is a utility/all-rounder. */
export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD" | "ALL";

export const PLAYER_POSITIONS: readonly PlayerPosition[] = [
  "GK",
  "DEF",
  "MID",
  "FWD",
  "ALL",
] as const;

/** Attribute keys for outfield players (non-GK), 1–99 each. */
export const OUTFIELD_ATTRIBUTE_KEYS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;

/** Attribute keys for goalkeepers, 1–99 each. */
export const GK_ATTRIBUTE_KEYS = ["DIV", "HAN", "KIC", "REF", "SPD", "POS"] as const;

export type OutfieldAttributeKey = (typeof OUTFIELD_ATTRIBUTE_KEYS)[number];
export type GkAttributeKey = (typeof GK_ATTRIBUTE_KEYS)[number];

/** Six named attributes (either the outfield set or the GK set). */
export type PlayerAttributes = Record<string, number>;

export type PlayerStatus = "active" | "archived";

export interface PublicPlayer {
  id: string;
  orgId: string;
  name: string;
  position: PlayerPosition;
  /**
   * Published overall rating (1–99): the manager baseline blended with
   * community votes. Equals `baseRating` when there are no votes.
   */
  rating: number;
  /** The manager-authored baseline OVR (server-derived from attributes). */
  baseRating: number;
  /** Number of distinct members who have voted on this player. */
  voteCount: number;
  attributes: PlayerAttributes;
  /** Optional contact email for match RSVPs. */
  email: string | null;
  /** Optional phone number for WhatsApp match notifications. */
  phone: string | null;
  status: PlayerStatus;
  /** True for the team captain (at most one active captain per org). */
  isCaptain: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

/** Response for setting/clearing the team captain. */
export interface SetCaptainResponse {
  player: PublicPlayer;
}

// ── Roster (players) ────────────────────────────────────────────

export interface CreatePlayerRequest {
  name: string;
  position: PlayerPosition;
  /** Omit to seed a default strength (OVR 60) the manager can adjust later. */
  attributes?: PlayerAttributes;
  /** Optional contact email for match RSVPs. */
  email?: string | null;
  /** Optional phone number for WhatsApp match notifications. */
  phone?: string | null;
}

export interface CreatePlayerResponse {
  player: PublicPlayer;
}

/** All fields optional; any provided field replaces the current value. */
export interface UpdatePlayerRequest {
  name?: string;
  position?: PlayerPosition;
  attributes?: PlayerAttributes;
  /** Set a contact email, or "" / null to clear it. */
  email?: string | null;
  /** Set a phone number, or "" / null to clear it. */
  phone?: string | null;
}

export interface UpdatePlayerResponse {
  player: PublicPlayer;
}

export interface GetPlayerResponse {
  player: PublicPlayer;
}

export interface ListPlayersResponse {
  players: PublicPlayer[];
}

export interface ArchivePlayerResponse {
  player: PublicPlayer;
}

// ── Community voting (skill stars → dynamic OVR) ─────────────────

/** A voter's per-skill star ratings, keyed by attribute key (e.g. PAC → 4). */
export type PlayerVoteMap = Record<string, number>;

/** Aggregate community sentiment surfaced to clients. */
export interface PlayerVoteStats {
  voterCount: number;
  /** Mean of every stored star (0 when there are no votes). */
  avgStars: number;
}

export interface CastVotesRequest {
  /** Skill → stars (1-5). Keys must match the player's position attributes. */
  votes: PlayerVoteMap;
}

export interface CastVotesResponse {
  player: PublicPlayer;
  /** The caller's own votes after the write. */
  myVotes: PlayerVoteMap;
  stats: PlayerVoteStats;
}

export interface GetVotesResponse {
  /** The caller's own votes (empty when they have not voted). */
  myVotes: PlayerVoteMap;
  stats: PlayerVoteStats;
}

// ── Rating rounds (manager-gated voting window) ─────────────────

export type RatingRoundStatus = "open" | "closed";

export interface PublicRatingRound {
  id: string;
  status: RatingRoundStatus;
  openedAt: string;
  closedAt: string | null;
}

/** GET /rating-round → the open round, or null when voting is closed. */
export interface GetRatingRoundResponse {
  round: PublicRatingRound | null;
}

export interface OpenRatingRoundRequest {
  /** When true, reset every player to an equal baseline OVR and clear votes. */
  resetScores?: boolean;
}

export interface RatingRoundResponse {
  round: PublicRatingRound;
}

/** Squad-depth analytics for the roster (mirrors the HTML's depth chips). */
export interface RosterSummaryEntry {
  position: PlayerPosition;
  count: number;
  /** Average OVR of active players in this position (0 when none). */
  averageRating: number;
}

export interface RosterSummaryResponse {
  totalPlayers: number;
  averageRating: number;
  byPosition: RosterSummaryEntry[];
}

export interface SuggestPositionRequest {
  attributes: PlayerAttributes;
}

export interface SuggestPositionResponse {
  position: PlayerPosition;
}

// ── Draft (balancing engine) ────────────────────────────────────

export interface DraftRequest {
  /** Player ids to draft from. Omitted/empty → all active players. */
  playerIds?: string[];
  /** Number of teams to split into (2–8). Default 2. */
  teamCount?: number;
  /** Display names for the teams. Default Home Team / Away Team / … */
  teamNames?: string[];
}

/** A drafted player as it appears in a draft/fixture (snapshot fields). */
export interface DraftedPlayer {
  id: string;
  name: string;
  position: PlayerPosition;
  rating: number;
}

export interface DraftedTeam {
  name: string;
  players: DraftedPlayer[];
  /** Average OVR of the team (0 when empty). */
  squadRating: number;
  /** Sum of player OVRs. */
  totalRating: number;
}

export interface DraftResponse {
  teams: DraftedTeam[];
  /** Difference between the highest and lowest team squad rating. */
  ratingSpread: number;
}

// ── Fixtures (matches) ──────────────────────────────────────────

export type MatchStatus = "scheduled" | "played" | "cancelled";

/** A team as persisted on a fixture (immutable lineup snapshot). */
export interface MatchTeam {
  name: string;
  players: DraftedPlayer[];
  squadRating: number;
}

/** Where a practice match is played; `booked` marks a secured pitch. */
export interface MatchVenue {
  name: string | null;
  address: string | null;
  booked: boolean;
  /** Google Maps location (URL or "lat,lng") players can tap to navigate. */
  mapsUrl: string | null;
}

export interface PublicMatch {
  id: string;
  orgId: string;
  scheduledAt: string;
  status: MatchStatus;
  format: string | null;
  teamA: MatchTeam;
  teamB: MatchTeam;
  ratingA: number;
  ratingB: number;
  scoreA: number | null;
  scoreB: number | null;
  venue: MatchVenue;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

/** A venue supplied when scheduling or updating a fixture. All fields optional. */
export interface MatchVenueInput {
  name?: string | null;
  address?: string | null;
  booked?: boolean;
  mapsUrl?: string | null;
}

/** Schedule a fixture from a chosen draft. Exactly two teams are persisted. */
export interface CreateMatchRequest {
  scheduledAt: string;
  format?: string;
  teamA: { name: string; players: DraftedPlayer[] };
  teamB: { name: string; players: DraftedPlayer[] };
  venue?: MatchVenueInput;
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

/** Server-generated share payload for a fixture (replaces client-side text). */
export interface MatchShareResponse {
  matchId: string;
  shareToken: string;
  text: string;
  whatsappUrl: string;
  mailtoUrl: string;
}

// ── Availability ────────────────────────────────────────────────
// Per-player availability for the community's next practice match. The
// organizer toggles each player in / maybe / out; the draft picks from `in`.

export type AvailabilityState = "in" | "maybe" | "out";

export interface PublicAvailability {
  playerId: string;
  state: AvailabilityState;
  updatedAt: string;
}

export interface ListAvailabilityResponse {
  availability: PublicAvailability[];
}

export interface SetAvailabilityRequest {
  state: AvailabilityState;
}

export interface SetAvailabilityResponse {
  availability: PublicAvailability;
}
