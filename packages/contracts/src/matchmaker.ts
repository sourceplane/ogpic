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
  /** Computed overall rating (1–99); always server-derived from attributes. */
  rating: number;
  attributes: PlayerAttributes;
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
  attributes: PlayerAttributes;
}

export interface CreatePlayerResponse {
  player: PublicPlayer;
}

/** All fields optional; any provided field replaces the current value. */
export interface UpdatePlayerRequest {
  name?: string;
  position?: PlayerPosition;
  attributes?: PlayerAttributes;
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
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

/** Schedule a fixture from a chosen draft. Exactly two teams are persisted. */
export interface CreateMatchRequest {
  scheduledAt: string;
  format?: string;
  teamA: { name: string; players: DraftedPlayer[] };
  teamB: { name: string; players: DraftedPlayer[] };
}

export interface CreateMatchResponse {
  match: PublicMatch;
}

/** Reschedule, record a result, or change status. All fields optional. */
export interface UpdateMatchRequest {
  scheduledAt?: string;
  status?: MatchStatus;
  scoreA?: number;
  scoreB?: number;
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
