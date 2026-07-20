import type { SqlExecutor } from "../hyperdrive/executor.js";
import type {
  Availability,
  AvailabilityState,
  ChatMessage,
  ChatMessageKind,
  CreateMatchInput,
  CreateMatchPollInput,
  CreatePlayerInput,
  CursorPosition,
  InsertChatMessageInput,
  ListChatMessagesParams,
  Match,
  MatchCursorPosition,
  MatchDropout,
  MatchPagedResult,
  MatchPageQueryParams,
  MatchPayment,
  MatchPoll,
  MatchPollDetail,
  MatchPollOption,
  MatchPollOptionWithVotes,
  MatchStatus,
  MatchmakerRepository,
  MatchmakerResult,
  MatchTeamSnapshot,
  OrgSettings,
  PagedResult,
  PageQueryParams,
  Player,
  PlayerPosition,
  PlayerVote,
  PlayerVoteStats,
  InsertRatingRoundResultInput,
  OpenRatingRoundInput,
  PollDeadlineKind,
  PollOptionKind,
  PositionCount,
  RatingRound,
  RatingRoundDeadlineKind,
  RatingRoundResult,
  RatingRoundStatus,
  SetOrgSettingsInput,
  UpdateMatchInput,
  UpdatePlayerInput,
} from "./types.js";

const POSITIONS: PlayerPosition[] = ["GK", "DEF", "MID", "FWD", "ALL"];

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    position: row.position as PlayerPosition,
    rating: Number(row.rating),
    attributes: parseJson<Record<string, number>>(row.attributes, {}),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    status: row.status as Player["status"],
    isCaptain: row.is_captain === true,
    subjectId: (row.subject_id as string | null) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    archivedAt: row.archived_at ? new Date(row.archived_at as string) : null,
  };
}

function mapMatch(row: Record<string, unknown>): Match {
  const emptyTeam: MatchTeamSnapshot = { name: "", players: [], squadRating: 0 };
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    scheduledAt: new Date(row.scheduled_at as string),
    status: row.status as MatchStatus,
    format: (row.format as string | null) ?? null,
    teamA: parseJson<MatchTeamSnapshot>(row.team_a, emptyTeam),
    teamB: parseJson<MatchTeamSnapshot>(row.team_b, emptyTeam),
    ratingA: Number(row.rating_a),
    ratingB: Number(row.rating_b),
    scoreA: row.score_a == null ? null : Number(row.score_a),
    scoreB: row.score_b == null ? null : Number(row.score_b),
    venue: {
      name: (row.venue_name as string | null) ?? null,
      address: (row.venue_address as string | null) ?? null,
      booked: row.venue_booked === true,
      mapsUrl: (row.venue_maps_url as string | null) ?? null,
    },
    shareToken: row.share_token as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function safeError(message: string): MatchmakerResult<never> {
  return { ok: false, error: { kind: "internal", message } };
}

/** A short, log-safe description of an unknown DB error. postgres.js errors
 *  carry a human `message` and a SQLSTATE `code`; preserving both turns a
 *  swallowed write failure (which otherwise collapses to a blank internal
 *  error → blanket 503) into something diagnosable in the server logs. */
function describeDbError(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const e = err as { message?: unknown; code?: unknown };
    const message = typeof e.message === "string" ? e.message : undefined;
    const code = typeof e.code === "string" ? e.code : undefined;
    if (message && code) return `${message} (${code})`;
    if (message) return message;
    if (code) return `SQLSTATE ${code}`;
  }
  return "unknown error";
}

function mapRatingRound(row: Record<string, unknown>): RatingRound {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    status: row.status as RatingRoundStatus,
    openedBy: row.opened_by as string,
    openedAt: new Date(row.opened_at as string),
    closedAt: row.closed_at ? new Date(row.closed_at as string) : null,
    deadlineKind: row.deadline_kind as RatingRoundDeadlineKind,
    deadlineAt: row.deadline_at ? new Date(row.deadline_at as string) : null,
  };
}

function mapRatingRoundResult(row: Record<string, unknown>): RatingRoundResult {
  return {
    roundId: row.round_id as string,
    orgId: row.org_id as string,
    playerId: row.player_id as string,
    ovrBefore: Number(row.ovr_before),
    ovrAfter: Number(row.ovr_after),
    votesReceived: Number(row.votes_received),
    createdAt: new Date(row.created_at as string),
  };
}

function mapAvailability(row: Record<string, unknown>): Availability {
  return {
    orgId: row.org_id as string,
    playerId: row.player_id as string,
    state: row.state as AvailabilityState,
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapMatchPoll(row: Record<string, unknown>): MatchPoll {
  return {
    matchId: row.match_id as string,
    orgId: row.org_id as string,
    deadlineKind: row.deadline_kind as PollDeadlineKind,
    deadlineAt: row.deadline_at ? new Date(row.deadline_at as string) : null,
    closedAt: row.closed_at ? new Date(row.closed_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapMatchPollOption(row: Record<string, unknown>): MatchPollOption {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    orgId: row.org_id as string,
    kind: row.kind as PollOptionKind,
    label: row.label as string,
    detail: (row.detail as string | null) ?? null,
    startsAt: row.starts_at ? new Date(row.starts_at as string) : null,
    position: Number(row.position),
    createdAt: new Date(row.created_at as string),
  };
}

function mapMatchDropout(row: Record<string, unknown>): MatchDropout {
  return {
    matchId: row.match_id as string,
    orgId: row.org_id as string,
    playerId: row.player_id as string,
    reason: row.reason as string,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    createdAt: new Date(row.created_at as string),
  };
}

function mapOrgSettings(row: Record<string, unknown>): OrgSettings {
  return {
    orgId: row.org_id as string,
    whatsappBridge: row.whatsapp_bridge === true,
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    kind: row.kind as ChatMessageKind,
    body: row.body as string,
    matchId: (row.match_id as string | null) ?? null,
    authorPlayerId: (row.author_player_id as string | null) ?? null,
    authorSubjectId: (row.author_subject_id as string | null) ?? null,
    authorName: (row.author_name as string | null) ?? null,
    reactions: parseJson<Record<string, string[]>>(row.reactions, {}),
    createdAt: new Date(row.created_at as string),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export function createMatchmakerRepository(executor: SqlExecutor): MatchmakerRepository {
  return {
    async createPlayer(input: CreatePlayerInput): Promise<MatchmakerResult<Player>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.players (id, org_id, name, position, rating, attributes, email, phone, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $9)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [
            input.id,
            input.orgId,
            input.name,
            input.position,
            input.rating,
            JSON.stringify(input.attributes),
            input.email,
            input.phone,
            input.createdAt.toISOString(),
          ],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "player" } };
        }
        return { ok: true, value: mapPlayer(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "player" } };
        }
        return safeError("Failed to create player");
      }
    },

    async getPlayerById(orgId: string, playerId: string): Promise<MatchmakerResult<Player>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.players WHERE org_id = $1 AND id = $2 AND status = 'active'`,
          [orgId, playerId],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapPlayer(result.rows[0]!) };
      } catch {
        return safeError("Failed to get player");
      }
    },

    async updatePlayer(
      orgId: string,
      playerId: string,
      input: UpdatePlayerInput,
    ): Promise<MatchmakerResult<Player>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.players
           SET name = $3, position = $4, rating = $5, attributes = $6::jsonb, email = $8, phone = $9, updated_at = $7
           WHERE org_id = $1 AND id = $2 AND status = 'active'
           RETURNING *`,
          [
            orgId,
            playerId,
            input.name,
            input.position,
            input.rating,
            JSON.stringify(input.attributes),
            input.updatedAt.toISOString(),
            input.email,
            input.phone,
          ],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapPlayer(result.rows[0]!) };
      } catch {
        return safeError("Failed to update player");
      }
    },

    async archivePlayer(orgId: string, playerId: string, archivedAt: Date): Promise<MatchmakerResult<Player>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.players
           SET status = 'archived', archived_at = $3, updated_at = $3
           WHERE org_id = $1 AND id = $2 AND status = 'active'
           RETURNING *`,
          [orgId, playerId, archivedAt.toISOString()],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapPlayer(result.rows[0]!) };
      } catch {
        return safeError("Failed to archive player");
      }
    },

    async listPlayersPaged(
      orgId: string,
      params: PageQueryParams,
      position: PlayerPosition | null,
    ): Promise<MatchmakerResult<PagedResult<Player>>> {
      try {
        const fetchLimit = params.limit + 1;
        const conds = ["org_id = $1", "status = 'active'"];
        const values: unknown[] = [orgId, fetchLimit];
        // $2 is reserved for the limit; position and cursor bind afterwards.
        if (position) {
          values.push(position);
          conds.push(`position = $${values.length}`);
        }
        if (params.cursor) {
          values.push(params.cursor.createdAt, params.cursor.id);
          conds.push(`(created_at, id) < ($${values.length - 1}, $${values.length})`);
        }
        const sql = `SELECT * FROM matchmaker.players
           WHERE ${conds.join(" AND ")}
           ORDER BY created_at DESC, id DESC
           LIMIT $2`;
        const result = await executor.execute<Record<string, unknown>>(sql, values);
        const rows = result.rows.map(mapPlayer);
        let nextCursor: CursorPosition | null = null;
        if (rows.length > params.limit) {
          rows.pop();
          const last = rows[rows.length - 1]!;
          nextCursor = { createdAt: last.createdAt.toISOString(), id: last.id };
        }
        return { ok: true, value: { items: rows, nextCursor } };
      } catch {
        return safeError("Failed to list players");
      }
    },

    async listActivePlayers(orgId: string): Promise<MatchmakerResult<Player[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.players
           WHERE org_id = $1 AND status = 'active'
           ORDER BY rating DESC, id DESC`,
          [orgId],
        );
        return { ok: true, value: result.rows.map(mapPlayer) };
      } catch {
        return safeError("Failed to list active players");
      }
    },

    async listActivePlayersByIds(orgId: string, ids: string[]): Promise<MatchmakerResult<Player[]>> {
      if (ids.length === 0) return { ok: true, value: [] };
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.players
           WHERE org_id = $1 AND status = 'active' AND id = ANY($2::uuid[])
           ORDER BY rating DESC, id DESC`,
          [orgId, ids],
        );
        return { ok: true, value: result.rows.map(mapPlayer) };
      } catch {
        return safeError("Failed to list players by id");
      }
    },

    async rosterSummary(orgId: string): Promise<MatchmakerResult<PositionCount[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT position, COUNT(*)::bigint AS count, COALESCE(AVG(rating), 0) AS avg_rating
           FROM matchmaker.players
           WHERE org_id = $1 AND status = 'active'
           GROUP BY position`,
          [orgId],
        );
        const byPos = new Map<string, PositionCount>();
        for (const row of result.rows) {
          const position = row.position as PlayerPosition;
          byPos.set(position, {
            position,
            count: Number(row.count),
            averageRating: Math.round(Number(row.avg_rating)),
          });
        }
        const summary: PositionCount[] = POSITIONS.map(
          (position) => byPos.get(position) ?? { position, count: 0, averageRating: 0 },
        );
        return { ok: true, value: summary };
      } catch {
        return safeError("Failed to summarize roster");
      }
    },

    async createMatch(input: CreateMatchInput): Promise<MatchmakerResult<Match>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.matches
             (id, org_id, scheduled_at, format, team_a, team_b, rating_a, rating_b, venue_name, venue_address, venue_booked, venue_maps_url, share_token, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $14)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [
            input.id,
            input.orgId,
            input.scheduledAt.toISOString(),
            input.format,
            JSON.stringify(input.teamA),
            JSON.stringify(input.teamB),
            input.ratingA,
            input.ratingB,
            input.venue.name,
            input.venue.address,
            input.venue.booked,
            input.venue.mapsUrl,
            input.shareToken,
            input.createdAt.toISOString(),
          ],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "match" } };
        }
        return { ok: true, value: mapMatch(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          return { ok: false, error: { kind: "conflict", entity: "match" } };
        }
        return safeError("Failed to create match");
      }
    },

    async getMatchById(orgId: string, matchId: string): Promise<MatchmakerResult<Match>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.matches WHERE org_id = $1 AND id = $2`,
          [orgId, matchId],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapMatch(result.rows[0]!) };
      } catch {
        return safeError("Failed to get match");
      }
    },

    async updateMatch(
      orgId: string,
      matchId: string,
      input: UpdateMatchInput,
    ): Promise<MatchmakerResult<Match>> {
      try {
        // COALESCE keeps the existing value when a field is not being updated.
        // score_a/score_b use a sentinel (-1) to distinguish "leave unchanged"
        // from an explicit set, since NULL is a legal cleared value.
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.matches
           SET scheduled_at = COALESCE($3, scheduled_at),
               status = COALESCE($4, status),
               score_a = CASE WHEN $5 = -1 THEN score_a ELSE NULLIF($5, -2) END,
               score_b = CASE WHEN $6 = -1 THEN score_b ELSE NULLIF($6, -2) END,
               venue_name = CASE WHEN $8 THEN $9 ELSE venue_name END,
               venue_address = CASE WHEN $8 THEN $10 ELSE venue_address END,
               venue_booked = CASE WHEN $8 THEN $11 ELSE venue_booked END,
               venue_maps_url = CASE WHEN $8 THEN $12 ELSE venue_maps_url END,
               team_a = CASE WHEN $13 THEN $14::jsonb ELSE team_a END,
               team_b = CASE WHEN $13 THEN $15::jsonb ELSE team_b END,
               rating_a = CASE WHEN $13 THEN $16 ELSE rating_a END,
               rating_b = CASE WHEN $13 THEN $17 ELSE rating_b END,
               updated_at = $7
           WHERE org_id = $1 AND id = $2
           RETURNING *`,
          [
            orgId,
            matchId,
            input.scheduledAt ? input.scheduledAt.toISOString() : null,
            input.status,
            input.scoreA == null ? -1 : input.scoreA,
            input.scoreB == null ? -1 : input.scoreB,
            input.updatedAt.toISOString(),
            input.venue !== null,
            input.venue?.name ?? null,
            input.venue?.address ?? null,
            input.venue?.booked ?? false,
            input.venue?.mapsUrl ?? null,
            input.teamA !== null && input.teamB !== null,
            input.teamA ? JSON.stringify(input.teamA) : null,
            input.teamB ? JSON.stringify(input.teamB) : null,
            input.teamA?.squadRating ?? 0,
            input.teamB?.squadRating ?? 0,
          ],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "not_found" } };
        }
        return { ok: true, value: mapMatch(result.rows[0]!) };
      } catch {
        return safeError("Failed to update match");
      }
    },

    async startDueMatches(now: Date): Promise<MatchmakerResult<number>> {
      // System cron (all orgs): flip every scheduled fixture whose kickoff has
      // arrived to 'live'. Idempotent — already-live/played rows are untouched.
      try {
        const result = await executor.execute(
          `UPDATE matchmaker.matches
             SET status = 'live', updated_at = $1
           WHERE status = 'scheduled' AND scheduled_at <= $1`,
          [now.toISOString()],
        );
        return { ok: true, value: result.rowCount ?? 0 };
      } catch {
        return safeError("Failed to auto-start due matches");
      }
    },

    async listMatchPayments(orgId: string, matchId: string): Promise<MatchmakerResult<MatchPayment[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT org_id, match_id, player_id, paid, updated_at
           FROM matchmaker.match_payments WHERE org_id = $1 AND match_id = $2`,
          [orgId, matchId],
        );
        return {
          ok: true,
          value: result.rows.map((r) => ({
            orgId: r.org_id as string,
            matchId: r.match_id as string,
            playerId: r.player_id as string,
            paid: r.paid === true,
            updatedAt: new Date(r.updated_at as string),
          })),
        };
      } catch {
        return safeError("Failed to list match payments");
      }
    },

    async setMatchPayment(orgId: string, matchId: string, playerId: string, paid: boolean, now: Date): Promise<MatchmakerResult<MatchPayment>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.match_payments (org_id, match_id, player_id, paid, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (org_id, match_id, player_id)
           DO UPDATE SET paid = EXCLUDED.paid, updated_at = EXCLUDED.updated_at
           RETURNING org_id, match_id, player_id, paid, updated_at`,
          [orgId, matchId, playerId, paid, now.toISOString()],
        );
        const r = result.rows[0]!;
        return {
          ok: true,
          value: {
            orgId: r.org_id as string,
            matchId: r.match_id as string,
            playerId: r.player_id as string,
            paid: r.paid === true,
            updatedAt: new Date(r.updated_at as string),
          },
        };
      } catch {
        return safeError("Failed to set match payment");
      }
    },

    async listScheduledMatchesInWindow(from: Date, to: Date): Promise<MatchmakerResult<Match[]>> {
      // System cron (all orgs): scheduled fixtures kicking off within [from, to],
      // used to remind players who haven't confirmed availability.
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.matches
           WHERE status = 'scheduled' AND scheduled_at >= $1 AND scheduled_at <= $2
           ORDER BY scheduled_at ASC`,
          [from.toISOString(), to.toISOString()],
        );
        return { ok: true, value: result.rows.map(mapMatch) };
      } catch {
        return safeError("Failed to list scheduled matches in window");
      }
    },

    async listMatchesPaged(
      orgId: string,
      params: MatchPageQueryParams,
    ): Promise<MatchmakerResult<MatchPagedResult<Match>>> {
      try {
        const fetchLimit = params.limit + 1;
        let sql: string;
        let values: unknown[];
        if (params.cursor) {
          sql = `SELECT * FROM matchmaker.matches
             WHERE org_id = $1 AND (scheduled_at, id) < ($3, $4)
             ORDER BY scheduled_at DESC, id DESC
             LIMIT $2`;
          values = [orgId, fetchLimit, params.cursor.scheduledAt, params.cursor.id];
        } else {
          sql = `SELECT * FROM matchmaker.matches
             WHERE org_id = $1
             ORDER BY scheduled_at DESC, id DESC
             LIMIT $2`;
          values = [orgId, fetchLimit];
        }
        const result = await executor.execute<Record<string, unknown>>(sql, values);
        const rows = result.rows.map(mapMatch);
        let nextCursor: MatchCursorPosition | null = null;
        if (rows.length > params.limit) {
          rows.pop();
          const last = rows[rows.length - 1]!;
          nextCursor = { scheduledAt: last.scheduledAt.toISOString(), id: last.id };
        }
        return { ok: true, value: { items: rows, nextCursor } };
      } catch {
        return safeError("Failed to list matches");
      }
    },

    async listAvailability(orgId: string): Promise<MatchmakerResult<Availability[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT org_id, player_id, state, updated_at
           FROM matchmaker.availability
           WHERE org_id = $1
           ORDER BY player_id`,
          [orgId],
        );
        return { ok: true, value: result.rows.map(mapAvailability) };
      } catch {
        return safeError("Failed to list availability");
      }
    },

    async setAvailability(
      orgId: string,
      playerId: string,
      state: AvailabilityState,
      now: Date,
    ): Promise<MatchmakerResult<Availability>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.availability (org_id, player_id, state, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (org_id, player_id)
           DO UPDATE SET state = EXCLUDED.state, updated_at = EXCLUDED.updated_at
           RETURNING org_id, player_id, state, updated_at`,
          [orgId, playerId, state, now.toISOString()],
        );
        return { ok: true, value: mapAvailability(result.rows[0]!) };
      } catch {
        return safeError("Failed to set availability");
      }
    },

    async setCaptain(orgId: string, playerId: string, now: Date): Promise<MatchmakerResult<Player>> {
      try {
        const iso = now.toISOString();
        const target = await executor.execute<Record<string, unknown>>(
          `SELECT id FROM matchmaker.players WHERE org_id = $1 AND id = $2 AND status = 'active'`,
          [orgId, playerId],
        );
        if (target.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        // Clear any existing captain, then set the target (no overlap → the
        // partial unique index is never transiently violated).
        await executor.execute(
          `UPDATE matchmaker.players SET is_captain = false, updated_at = $2 WHERE org_id = $1 AND is_captain = true`,
          [orgId, iso],
        );
        const set = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.players SET is_captain = true, updated_at = $3 WHERE org_id = $1 AND id = $2 RETURNING *`,
          [orgId, playerId, iso],
        );
        return { ok: true, value: mapPlayer(set.rows[0]!) };
      } catch {
        return safeError("Failed to set captain");
      }
    },

    async claimPlayer(orgId: string, playerId: string, subjectId: string, now: Date): Promise<MatchmakerResult<Player>> {
      try {
        // Only claim an active, currently-unclaimed player. The partial unique
        // index (org_id, subject_id) enforces one player per subject; a second
        // claim surfaces as a Postgres unique violation → conflict.
        const set = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.players
             SET subject_id = $3, updated_at = $4
           WHERE org_id = $1 AND id = $2 AND status = 'active' AND subject_id IS NULL
           RETURNING *`,
          [orgId, playerId, subjectId, now.toISOString()],
        );
        if (set.rowCount === 0) {
          // Either the player doesn't exist / isn't active, or it's already claimed.
          return { ok: false, error: { kind: "conflict", entity: "player" } };
        }
        return { ok: true, value: mapPlayer(set.rows[0]!) };
      } catch (err) {
        if (isUniqueViolation(err)) return { ok: false, error: { kind: "conflict", entity: "player" } };
        return safeError("Failed to claim player");
      }
    },

    async getPlayerBySubject(orgId: string, subjectId: string): Promise<MatchmakerResult<Player>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.players WHERE org_id = $1 AND subject_id = $2 AND status = 'active'`,
          [orgId, subjectId],
        );
        if (result.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        return { ok: true, value: mapPlayer(result.rows[0]!) };
      } catch {
        return safeError("Failed to look up player by subject");
      }
    },

    async castPlayerVotes(input): Promise<MatchmakerResult<void>> {
      if (input.votes.length === 0) return { ok: true, value: undefined };
      try {
        const iso = input.now.toISOString();
        const values: unknown[] = [input.orgId, input.playerId, input.voterId, iso];
        const tuples = input.votes.map((v) => {
          const skillIdx = values.push(v.skill);
          const starsIdx = values.push(v.stars);
          return `($1, $2, $3, $${skillIdx}, $${starsIdx}, $4, $4)`;
        });
        await executor.execute(
          `INSERT INTO matchmaker.player_votes (org_id, player_id, voter_id, skill, stars, created_at, updated_at)
           VALUES ${tuples.join(", ")}
           ON CONFLICT (org_id, player_id, voter_id, skill)
           DO UPDATE SET stars = EXCLUDED.stars, updated_at = EXCLUDED.updated_at`,
          values,
        );
        return { ok: true, value: undefined };
      } catch {
        return safeError("Failed to cast votes");
      }
    },

    async getVoterVotes(orgId, playerId, voterId): Promise<MatchmakerResult<PlayerVote[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT skill, stars FROM matchmaker.player_votes
           WHERE org_id = $1 AND player_id = $2 AND voter_id = $3`,
          [orgId, playerId, voterId],
        );
        return {
          ok: true,
          value: result.rows.map((r) => ({ skill: r.skill as string, stars: Number(r.stars) })),
        };
      } catch {
        return safeError("Failed to get voter votes");
      }
    },

    async getPlayerVoteStats(orgId, playerId): Promise<MatchmakerResult<PlayerVoteStats>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT COUNT(DISTINCT voter_id) AS voter_count, COALESCE(AVG(stars), 0) AS avg_stars
           FROM matchmaker.player_votes WHERE org_id = $1 AND player_id = $2`,
          [orgId, playerId],
        );
        const row = result.rows[0];
        return {
          ok: true,
          value: {
            playerId,
            voterCount: row ? Number(row.voter_count) : 0,
            avgStars: row ? Number(row.avg_stars) : 0,
          },
        };
      } catch {
        return safeError("Failed to get player vote stats");
      }
    },

    async listPlayerVoteStats(orgId): Promise<MatchmakerResult<PlayerVoteStats[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT player_id, COUNT(DISTINCT voter_id) AS voter_count, AVG(stars) AS avg_stars
           FROM matchmaker.player_votes WHERE org_id = $1 GROUP BY player_id`,
          [orgId],
        );
        return {
          ok: true,
          value: result.rows.map((r) => ({
            playerId: r.player_id as string,
            voterCount: Number(r.voter_count),
            avgStars: Number(r.avg_stars),
          })),
        };
      } catch {
        return safeError("Failed to list player vote stats");
      }
    },

    async getOpenRatingRound(orgId): Promise<MatchmakerResult<RatingRound | null>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.rating_rounds WHERE org_id = $1 AND status = 'open' LIMIT 1`,
          [orgId],
        );
        return { ok: true, value: result.rowCount === 0 ? null : mapRatingRound(result.rows[0]!) };
      } catch {
        return safeError("Failed to get open rating round");
      }
    },

    async openRatingRound(input: OpenRatingRoundInput): Promise<MatchmakerResult<RatingRound>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.rating_rounds (id, org_id, status, opened_by, opened_at, deadline_kind, deadline_at)
           VALUES ($1, $2, 'open', $3, $4, $5, $6)
           RETURNING *`,
          [
            input.id,
            input.orgId,
            input.openedBy,
            input.now.toISOString(),
            input.deadlineKind,
            input.deadlineAt ? input.deadlineAt.toISOString() : null,
          ],
        );
        return { ok: true, value: mapRatingRound(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) return { ok: false, error: { kind: "conflict", entity: "rating_round" } };
        return safeError("Failed to open rating round");
      }
    },

    async closeRatingRound(orgId, now): Promise<MatchmakerResult<RatingRound>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.rating_rounds SET status = 'closed', closed_at = $2
           WHERE org_id = $1 AND status = 'open'
           RETURNING *`,
          [orgId, now.toISOString()],
        );
        if (result.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        return { ok: true, value: mapRatingRound(result.rows[0]!) };
      } catch {
        return safeError("Failed to close rating round");
      }
    },

    async getLatestClosedRatingRound(orgId): Promise<MatchmakerResult<RatingRound | null>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.rating_rounds
           WHERE org_id = $1 AND status = 'closed'
           ORDER BY closed_at DESC NULLS LAST
           LIMIT 1`,
          [orgId],
        );
        return { ok: true, value: result.rowCount === 0 ? null : mapRatingRound(result.rows[0]!) };
      } catch {
        return safeError("Failed to get latest closed rating round");
      }
    },

    async insertRatingRoundResults(rows: InsertRatingRoundResultInput[]): Promise<MatchmakerResult<void>> {
      if (rows.length === 0) return { ok: true, value: undefined };
      try {
        const values: unknown[] = [];
        const tuples = rows.map((r) => {
          const roundIdx = values.push(r.roundId);
          const orgIdx = values.push(r.orgId);
          const playerIdx = values.push(r.playerId);
          const beforeIdx = values.push(r.ovrBefore);
          const afterIdx = values.push(r.ovrAfter);
          const votesIdx = values.push(r.votesReceived);
          const createdIdx = values.push(r.createdAt.toISOString());
          return `($${roundIdx}::uuid, $${orgIdx}::uuid, $${playerIdx}::uuid, $${beforeIdx}::numeric, $${afterIdx}::numeric, $${votesIdx}::int, $${createdIdx}::timestamptz)`;
        });
        await executor.execute(
          `INSERT INTO matchmaker.rating_round_results (round_id, org_id, player_id, ovr_before, ovr_after, votes_received, created_at)
           VALUES ${tuples.join(", ")}
           ON CONFLICT (round_id, player_id) DO NOTHING`,
          values,
        );
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: { kind: "internal", message: `Failed to insert rating round results: ${describeDbError(err)}` },
        };
      }
    },

    async listRatingRoundResults(orgId, roundId): Promise<MatchmakerResult<RatingRoundResult[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.rating_round_results
           WHERE org_id = $1 AND round_id = $2
           ORDER BY created_at ASC`,
          [orgId, roundId],
        );
        return { ok: true, value: result.rows.map(mapRatingRoundResult) };
      } catch {
        return safeError("Failed to list rating round results");
      }
    },

    async listDueRatingRounds(now, limit): Promise<MatchmakerResult<RatingRound[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.rating_rounds
           WHERE status = 'open' AND deadline_at IS NOT NULL AND deadline_at <= $1
           ORDER BY deadline_at ASC
           LIMIT $2`,
          [now.toISOString(), limit],
        );
        return { ok: true, value: result.rows.map(mapRatingRound) };
      } catch {
        return safeError("Failed to list due rating rounds");
      }
    },

    async resetScoresToBaseline(orgId, baseline, now): Promise<MatchmakerResult<void>> {
      try {
        const iso = now.toISOString();
        await executor.execute(`DELETE FROM matchmaker.player_votes WHERE org_id = $1`, [orgId]);
        await executor.execute(
          `UPDATE matchmaker.players SET rating = $2, updated_at = $3 WHERE org_id = $1 AND status = 'active'`,
          [orgId, baseline, iso],
        );
        return { ok: true, value: undefined };
      } catch {
        return safeError("Failed to reset scores to baseline");
      }
    },

    async createMatchPoll(input: CreateMatchPollInput, now: Date): Promise<MatchmakerResult<MatchPollDetail>> {
      try {
        const iso = now.toISOString();
        const pollResult = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.match_polls (match_id, org_id, deadline_kind, deadline_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)
           ON CONFLICT (match_id) DO NOTHING
           RETURNING *`,
          [input.matchId, input.orgId, input.deadlineKind, input.deadlineAt ? input.deadlineAt.toISOString() : null, iso],
        );
        if (pollResult.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "match_poll" } };
        }
        const poll = mapMatchPoll(pollResult.rows[0]!);

        let options: MatchPollOptionWithVotes[] = [];
        if (input.options.length > 0) {
          const values: unknown[] = [];
          const tuples = input.options.map((opt) => {
            const idIdx = values.push(opt.id);
            const matchIdx = values.push(input.matchId);
            const orgIdx = values.push(input.orgId);
            const kindIdx = values.push(opt.kind);
            const labelIdx = values.push(opt.label);
            const detailIdx = values.push(opt.detail);
            const startsIdx = values.push(opt.startsAt ? opt.startsAt.toISOString() : null);
            const posIdx = values.push(opt.position);
            const createdIdx = values.push(iso);
            return `($${idIdx}, $${matchIdx}, $${orgIdx}, $${kindIdx}, $${labelIdx}, $${detailIdx}, $${startsIdx}, $${posIdx}, $${createdIdx})`;
          });
          const optResult = await executor.execute<Record<string, unknown>>(
            `INSERT INTO matchmaker.match_poll_options (id, match_id, org_id, kind, label, detail, starts_at, position, created_at)
             VALUES ${tuples.join(", ")}
             RETURNING *`,
            values,
          );
          options = optResult.rows.map((r) => ({ ...mapMatchPollOption(r), voterPlayerIds: [] }));
        }
        return { ok: true, value: { poll, options } };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) return { ok: false, error: { kind: "conflict", entity: "match_poll" } };
        return safeError("Failed to create match poll");
      }
    },

    async getMatchPoll(orgId: string, matchId: string): Promise<MatchmakerResult<MatchPollDetail>> {
      try {
        const pollResult = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.match_polls WHERE org_id = $1 AND match_id = $2`,
          [orgId, matchId],
        );
        if (pollResult.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        const poll = mapMatchPoll(pollResult.rows[0]!);

        const optResult = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.match_poll_options WHERE org_id = $1 AND match_id = $2 ORDER BY kind, position`,
          [orgId, matchId],
        );
        const voteResult = await executor.execute<Record<string, unknown>>(
          `SELECT option_id, player_id FROM matchmaker.match_poll_votes WHERE org_id = $1 AND match_id = $2`,
          [orgId, matchId],
        );
        const votersByOption = new Map<string, string[]>();
        for (const row of voteResult.rows) {
          const optionId = row.option_id as string;
          const list = votersByOption.get(optionId) ?? [];
          list.push(row.player_id as string);
          votersByOption.set(optionId, list);
        }
        const options: MatchPollOptionWithVotes[] = optResult.rows.map((r) => {
          const option = mapMatchPollOption(r);
          return { ...option, voterPlayerIds: votersByOption.get(option.id) ?? [] };
        });
        return { ok: true, value: { poll, options } };
      } catch {
        return safeError("Failed to get match poll");
      }
    },

    async setPollVotes(
      orgId: string,
      matchId: string,
      playerId: string,
      optionIds: string[],
      now: Date,
    ): Promise<MatchmakerResult<void>> {
      try {
        const uniqueIds = Array.from(new Set(optionIds));
        if (uniqueIds.length > 0) {
          const check = await executor.execute<Record<string, unknown>>(
            `SELECT id FROM matchmaker.match_poll_options WHERE org_id = $1 AND match_id = $2 AND id = ANY($3::uuid[])`,
            [orgId, matchId, uniqueIds],
          );
          if (check.rowCount !== uniqueIds.length) {
            return {
              ok: false,
              error: { kind: "validation", message: "One or more option ids do not belong to this match's poll" },
            };
          }
        }
        const pollOpenGuard = `EXISTS (
             SELECT 1 FROM matchmaker.match_polls p WHERE p.match_id = $2 AND p.org_id = $1 AND p.closed_at IS NULL
           )`;
        if (uniqueIds.length === 0) {
          await executor.execute(
            `DELETE FROM matchmaker.match_poll_votes
             WHERE org_id = $1 AND match_id = $2 AND player_id = $3 AND ${pollOpenGuard}`,
            [orgId, matchId, playerId],
          );
          return { ok: true, value: undefined };
        }
        const iso = now.toISOString();
        // Bind each option id as its own scalar `$n::uuid` (mirroring the
        // proven expanded-VALUES bulk insert in castPlayerVotes) rather than a
        // single `uuid[]` array parameter fed to `unnest`/`!= ALL`. Every value
        // bound to a uuid/timestamptz column carries an explicit cast so the
        // write never depends on the driver's parameter-type inference — a bare
        // string param landing in a uuid column can surface as a Postgres type
        // error ("column ... is of type uuid but expression is of type text"),
        // which the catch below would otherwise swallow into a blanket 503.
        const idPlaceholders = uniqueIds.map((_, i) => `$${i + 4}::uuid`);
        // Two separate statements rather than one delete+insert CTE: a single
        // CTE shares one snapshot, so re-voting while KEEPING an option would
        // delete then immediately re-insert that row, colliding with a
        // not-yet-committed identical row (PK conflict). Instead: only
        // de-selected options are deleted, and newly-selected options are
        // inserted with ON CONFLICT DO NOTHING so unchanged rows are untouched.
        await executor.execute(
          `DELETE FROM matchmaker.match_poll_votes
           WHERE org_id = $1 AND match_id = $2 AND player_id = $3
             AND option_id NOT IN (${idPlaceholders.join(", ")}) AND ${pollOpenGuard}`,
          [orgId, matchId, playerId, ...uniqueIds],
        );
        const isoIdx = uniqueIds.length + 4;
        const valuesRows = uniqueIds.map(
          (_, i) => `($${i + 4}::uuid, $2::uuid, $1::uuid, $3::uuid, $${isoIdx}::timestamptz)`,
        );
        await executor.execute(
          `INSERT INTO matchmaker.match_poll_votes (option_id, match_id, org_id, player_id, created_at)
           SELECT v.option_id, v.match_id, v.org_id, v.player_id, v.created_at
           FROM (VALUES ${valuesRows.join(", ")}) AS v(option_id, match_id, org_id, player_id, created_at)
           WHERE ${pollOpenGuard}
           ON CONFLICT DO NOTHING`,
          [orgId, matchId, playerId, ...uniqueIds, iso],
        );
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: { kind: "internal", message: `Failed to set poll votes: ${describeDbError(err)}` } };
      }
    },

    async closeMatchPoll(orgId: string, matchId: string, now: Date): Promise<MatchmakerResult<MatchPoll>> {
      try {
        const iso = now.toISOString();
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.match_polls SET closed_at = $3, updated_at = $3
           WHERE org_id = $1 AND match_id = $2 AND closed_at IS NULL
           RETURNING *`,
          [orgId, matchId, iso],
        );
        if (result.rowCount === 0) {
          const exists = await executor.execute<Record<string, unknown>>(
            `SELECT match_id FROM matchmaker.match_polls WHERE org_id = $1 AND match_id = $2`,
            [orgId, matchId],
          );
          if (exists.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
          return { ok: false, error: { kind: "conflict", entity: "match_poll" } };
        }
        return { ok: true, value: mapMatchPoll(result.rows[0]!) };
      } catch {
        return safeError("Failed to close match poll");
      }
    },

    async listDuePolls(now: Date, limit: number): Promise<MatchmakerResult<MatchPoll[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.match_polls
           WHERE closed_at IS NULL AND deadline_at IS NOT NULL AND deadline_at <= $1
           ORDER BY deadline_at ASC
           LIMIT $2`,
          [now.toISOString(), limit],
        );
        return { ok: true, value: result.rows.map(mapMatchPoll) };
      } catch {
        return safeError("Failed to list due polls");
      }
    },

    async upsertDropout(
      orgId: string,
      matchId: string,
      playerId: string,
      reason: string,
      now: Date,
    ): Promise<MatchmakerResult<MatchDropout>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.match_dropouts (match_id, org_id, player_id, reason, resolved_at, created_at)
           VALUES ($1, $2, $3, $4, NULL, $5)
           ON CONFLICT (match_id, player_id)
           DO UPDATE SET reason = EXCLUDED.reason, resolved_at = NULL
           RETURNING *`,
          [matchId, orgId, playerId, reason, now.toISOString()],
        );
        return { ok: true, value: mapMatchDropout(result.rows[0]!) };
      } catch {
        return safeError("Failed to set dropout");
      }
    },

    async deleteDropout(orgId: string, matchId: string, playerId: string): Promise<MatchmakerResult<MatchDropout>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `DELETE FROM matchmaker.match_dropouts
           WHERE org_id = $1 AND match_id = $2 AND player_id = $3 AND resolved_at IS NULL
           RETURNING *`,
          [orgId, matchId, playerId],
        );
        if (result.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        return { ok: true, value: mapMatchDropout(result.rows[0]!) };
      } catch {
        return safeError("Failed to delete dropout");
      }
    },

    async resolveDropout(
      orgId: string,
      matchId: string,
      playerId: string,
      now: Date,
    ): Promise<MatchmakerResult<MatchDropout>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.match_dropouts SET resolved_at = $4
           WHERE org_id = $1 AND match_id = $2 AND player_id = $3 AND resolved_at IS NULL
           RETURNING *`,
          [orgId, matchId, playerId, now.toISOString()],
        );
        if (result.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        return { ok: true, value: mapMatchDropout(result.rows[0]!) };
      } catch {
        return safeError("Failed to resolve dropout");
      }
    },

    async listDropouts(orgId: string, matchId: string): Promise<MatchmakerResult<MatchDropout[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.match_dropouts WHERE org_id = $1 AND match_id = $2 ORDER BY created_at ASC`,
          [orgId, matchId],
        );
        return { ok: true, value: result.rows.map(mapMatchDropout) };
      } catch {
        return safeError("Failed to list dropouts");
      }
    },

    async listOpenDropouts(orgId: string): Promise<MatchmakerResult<MatchDropout[]>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.match_dropouts WHERE org_id = $1 AND resolved_at IS NULL ORDER BY created_at ASC`,
          [orgId],
        );
        return { ok: true, value: result.rows.map(mapMatchDropout) };
      } catch {
        return safeError("Failed to list open dropouts");
      }
    },

    async getOrgSettings(orgId: string): Promise<MatchmakerResult<OrgSettings | null>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `SELECT * FROM matchmaker.org_settings WHERE org_id = $1`,
          [orgId],
        );
        return { ok: true, value: result.rowCount === 0 ? null : mapOrgSettings(result.rows[0]!) };
      } catch {
        return safeError("Failed to get org settings");
      }
    },

    async setOrgSettings(orgId: string, input: SetOrgSettingsInput, now: Date): Promise<MatchmakerResult<OrgSettings>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.org_settings (org_id, whatsapp_bridge, updated_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (org_id)
           DO UPDATE SET whatsapp_bridge = EXCLUDED.whatsapp_bridge, updated_at = EXCLUDED.updated_at
           RETURNING *`,
          [orgId, input.whatsappBridge, now.toISOString()],
        );
        return { ok: true, value: mapOrgSettings(result.rows[0]!) };
      } catch {
        return safeError("Failed to set org settings");
      }
    },

    async insertChatMessage(input: InsertChatMessageInput): Promise<MatchmakerResult<ChatMessage>> {
      try {
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.chat_messages (id, org_id, kind, body, match_id, author_player_id, author_subject_id, author_name, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING
           RETURNING *`,
          [
            input.id,
            input.orgId,
            input.kind,
            input.body,
            input.matchId,
            input.authorPlayerId,
            input.authorSubjectId,
            input.authorName,
            input.createdAt.toISOString(),
          ],
        );
        if (result.rowCount === 0) {
          return { ok: false, error: { kind: "conflict", entity: "chat_message" } };
        }
        return { ok: true, value: mapChatMessage(result.rows[0]!) };
      } catch (err: unknown) {
        if (isUniqueViolation(err)) return { ok: false, error: { kind: "conflict", entity: "chat_message" } };
        return safeError("Failed to insert chat message");
      }
    },

    async listChatMessages(orgId: string, params: ListChatMessagesParams): Promise<MatchmakerResult<ChatMessage[]>> {
      try {
        const conds = ["org_id = $1"];
        const values: unknown[] = [orgId];
        if (params.before && params.beforeId) {
          // Row-value comparison matches the (created_at DESC, id DESC)
          // index and breaks ties safely when multiple messages share the
          // same created_at.
          values.push(params.before.toISOString(), params.beforeId);
          conds.push(`(created_at, id) < ($${values.length - 1}, $${values.length})`);
        } else if (params.before) {
          values.push(params.before.toISOString());
          conds.push(`created_at < $${values.length}`);
        }
        values.push(params.limit);
        const sql = `SELECT * FROM matchmaker.chat_messages
           WHERE ${conds.join(" AND ")}
           ORDER BY created_at DESC, id DESC
           LIMIT $${values.length}`;
        const result = await executor.execute<Record<string, unknown>>(sql, values);
        return { ok: true, value: result.rows.map(mapChatMessage) };
      } catch {
        return safeError("Failed to list chat messages");
      }
    },

    async toggleChatReaction(
      orgId: string,
      messageId: string,
      emoji: string,
      subjectId: string,
    ): Promise<MatchmakerResult<ChatMessage>> {
      try {
        // Single atomic jsonb UPDATE (no prior SELECT): a read-modify-write
        // round trip would lose concurrent reactions from other subjects
        // arriving between the read and the write.
        const updated = await executor.execute<Record<string, unknown>>(
          `UPDATE matchmaker.chat_messages SET reactions = (
             CASE WHEN COALESCE(reactions->$3, '[]'::jsonb) ? $4 THEN
               CASE WHEN jsonb_array_length(reactions->$3) <= 1 THEN reactions - $3
                    ELSE jsonb_set(reactions, ARRAY[$3], (
                      SELECT COALESCE(jsonb_agg(t.v), '[]'::jsonb)
                      FROM jsonb_array_elements_text(reactions->$3) AS t(v)
                      WHERE t.v <> $4
                    ))
               END
             ELSE jsonb_set(reactions, ARRAY[$3], COALESCE(reactions->$3, '[]'::jsonb) || to_jsonb($4::text))
             END)
           WHERE org_id = $1 AND id = $2
           RETURNING *`,
          [orgId, messageId, emoji, subjectId],
        );
        if (updated.rowCount === 0) return { ok: false, error: { kind: "not_found" } };
        return { ok: true, value: mapChatMessage(updated.rows[0]!) };
      } catch {
        return safeError("Failed to toggle chat reaction");
      }
    },
  };
}
