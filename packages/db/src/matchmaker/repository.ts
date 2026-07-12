import type { SqlExecutor } from "../hyperdrive/executor.js";
import type {
  Availability,
  AvailabilityState,
  CreateMatchInput,
  CreatePlayerInput,
  CursorPosition,
  Match,
  MatchCursorPosition,
  MatchPagedResult,
  MatchPageQueryParams,
  MatchStatus,
  MatchmakerRepository,
  MatchmakerResult,
  MatchTeamSnapshot,
  PagedResult,
  PageQueryParams,
  Player,
  PlayerPosition,
  PlayerVote,
  PlayerVoteStats,
  PositionCount,
  RatingRound,
  RatingRoundStatus,
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

function mapRatingRound(row: Record<string, unknown>): RatingRound {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    status: row.status as RatingRoundStatus,
    openedBy: row.opened_by as string,
    openedAt: new Date(row.opened_at as string),
    closedAt: row.closed_at ? new Date(row.closed_at as string) : null,
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

    async openRatingRound(id, orgId, openedBy, now): Promise<MatchmakerResult<RatingRound>> {
      try {
        const iso = now.toISOString();
        const result = await executor.execute<Record<string, unknown>>(
          `INSERT INTO matchmaker.rating_rounds (id, org_id, status, opened_by, opened_at)
           VALUES ($1, $2, 'open', $3, $4)
           RETURNING *`,
          [id, orgId, openedBy, iso],
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
  };
}
