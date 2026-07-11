// Matchmaker CLI commands — roster, draft, and fixtures. Thin adapters over the
// SDK (`client.roster` / `client.draft` / `client.fixtures`) mirroring the
// api-edge routes, with `--output json` parity for scripting.

import type { CommandContext, CommandResult } from "../router.js";
import type {
  CreateMatchRequest,
  PlayerAttributes,
  PlayerPosition,
  UpdatePlayerRequest,
} from "@saas/sdk";
import { formatOutput } from "../output/index.js";
import { UsageError } from "../errors.js";
import { resolveOrgId, readIdempotencyKey } from "./helpers.js";

function flagString(ctx: CommandContext, name: string): string | undefined {
  const v = ctx.flags[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseJsonFlag<T>(ctx: CommandContext, name: string): T | undefined {
  const raw = flagString(ctx, name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new UsageError(`--${name} must be valid JSON`);
  }
}

function emit(ctx: CommandContext, record: Record<string, string>, jsonData: unknown, title: string): void {
  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: jsonData }));
    return;
  }
  ctx.stdout(formatOutput({ mode: "human", record, title }));
}

// ── Roster ──────────────────────────────────────────────────────

export async function playerListCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const position = flagString(ctx, "position") as PlayerPosition | undefined;
  const sdk = await ctx.sdk();
  const result = await sdk.roster.list(orgId, position ? { position } : {});

  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }
  const rows = result.players.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    ovr: String(p.rating),
  }));
  ctx.stdout(
    formatOutput({ mode: "human", columns: ["id", "name", "position", "ovr"], rows, title: `Roster in ${orgId}` }),
  );
  return { exitCode: 0 };
}

export async function playerScoutCommand(ctx: CommandContext): Promise<CommandResult> {
  const name = ctx.args[0];
  if (name === undefined || name.length === 0) {
    throw new UsageError(
      'usage: ogpic matchmaker player scout <name> --position=POS --attributes=\'{"PAC":80,...}\'',
    );
  }
  const position = flagString(ctx, "position") as PlayerPosition | undefined;
  if (position === undefined) {
    throw new UsageError("--position is required (GK, DEF, MID, FWD, ALL)");
  }
  const attributes = parseJsonFlag<PlayerAttributes>(ctx, "attributes");
  if (attributes === undefined) {
    throw new UsageError('--attributes is required, e.g. \'{"PAC":80,"SHO":80,"PAS":80,"DRI":80,"DEF":80,"PHY":80}\'');
  }

  const orgId = await resolveOrgId(ctx, false);
  const idempotencyKey = readIdempotencyKey(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.roster.scout(
    orgId,
    { name, position, attributes },
    idempotencyKey !== undefined ? { idempotencyKey } : {},
  );
  const p = result.player;
  emit(ctx, { id: p.id, name: p.name, position: p.position, ovr: String(p.rating) }, result, `Player scouted in ${orgId}`);
  return { exitCode: 0 };
}

export async function playerShowCommand(ctx: CommandContext): Promise<CommandResult> {
  const playerId = ctx.args[0];
  if (playerId === undefined) throw new UsageError("usage: ogpic matchmaker player show <playerId>");
  const orgId = await resolveOrgId(ctx, false);
  const sdk = await ctx.sdk();
  const result = await sdk.roster.get(orgId, playerId);
  const p = result.player;
  emit(ctx, { id: p.id, name: p.name, position: p.position, ovr: String(p.rating) }, result, `Player ${p.id}`);
  return { exitCode: 0 };
}

export async function playerEditCommand(ctx: CommandContext): Promise<CommandResult> {
  const playerId = ctx.args[0];
  if (playerId === undefined) {
    throw new UsageError("usage: ogpic matchmaker player edit <playerId> --data='{...}'");
  }
  const body = parseJsonFlag<UpdatePlayerRequest>(ctx, "data");
  if (body === undefined) throw new UsageError("--data (a JSON UpdatePlayerRequest) is required");
  const orgId = await resolveOrgId(ctx, false);
  const idempotencyKey = readIdempotencyKey(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.roster.update(orgId, playerId, body, idempotencyKey !== undefined ? { idempotencyKey } : {});
  const p = result.player;
  emit(ctx, { id: p.id, name: p.name, position: p.position, ovr: String(p.rating) }, result, `Player updated`);
  return { exitCode: 0 };
}

export async function playerReleaseCommand(ctx: CommandContext): Promise<CommandResult> {
  const playerId = ctx.args[0];
  if (playerId === undefined) throw new UsageError("usage: ogpic matchmaker player release <playerId>");
  const orgId = await resolveOrgId(ctx, false);
  const idempotencyKey = readIdempotencyKey(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.roster.release(orgId, playerId, idempotencyKey !== undefined ? { idempotencyKey } : {});
  const p = result.player;
  emit(ctx, { id: p.id, name: p.name, status: p.status }, result, `Player released`);
  return { exitCode: 0 };
}

export async function rosterSummaryCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const sdk = await ctx.sdk();
  const result = await sdk.roster.summary(orgId);
  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }
  const rows = result.byPosition.map((e) => ({
    position: e.position,
    count: String(e.count),
    avg: String(e.averageRating),
  }));
  ctx.stdout(
    formatOutput({
      mode: "human",
      columns: ["position", "count", "avg"],
      rows,
      title: `Roster summary — ${result.totalPlayers} players, avg OVR ${result.averageRating}`,
    }),
  );
  return { exitCode: 0 };
}

// ── Draft ───────────────────────────────────────────────────────

export async function draftRunCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const teamCountRaw = flagString(ctx, "team-count");
  const playersRaw = flagString(ctx, "players");
  const body: { teamCount?: number; playerIds?: string[] } = {};
  if (teamCountRaw !== undefined) {
    const n = Number(teamCountRaw);
    if (!Number.isInteger(n)) throw new UsageError("--team-count must be an integer");
    body.teamCount = n;
  }
  if (playersRaw !== undefined) {
    body.playerIds = playersRaw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }
  const sdk = await ctx.sdk();
  const result = await sdk.draft.run(orgId, body);
  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }
  const rows = result.teams.map((t) => ({
    team: t.name,
    players: String(t.players.length),
    ovr: String(t.squadRating),
  }));
  ctx.stdout(
    formatOutput({
      mode: "human",
      columns: ["team", "players", "ovr"],
      rows,
      title: `Draft — ${result.teams.length} teams, rating spread ${result.ratingSpread}`,
    }),
  );
  return { exitCode: 0 };
}

// ── Fixtures ────────────────────────────────────────────────────

export async function fixtureListCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const sdk = await ctx.sdk();
  const result = await sdk.fixtures.list(orgId);
  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }
  const rows = result.matches.map((m) => ({
    id: m.id,
    kickoff: m.scheduledAt,
    status: m.status,
    score: m.scoreA === null ? "—" : `${m.scoreA}-${m.scoreB}`,
  }));
  ctx.stdout(
    formatOutput({ mode: "human", columns: ["id", "kickoff", "status", "score"], rows, title: `Fixtures in ${orgId}` }),
  );
  return { exitCode: 0 };
}

export async function fixtureScheduleCommand(ctx: CommandContext): Promise<CommandResult> {
  const body = parseJsonFlag<CreateMatchRequest>(ctx, "data");
  if (body === undefined) {
    throw new UsageError("usage: ogpic matchmaker fixture schedule --data='<CreateMatchRequest JSON>'");
  }
  const orgId = await resolveOrgId(ctx, false);
  const idempotencyKey = readIdempotencyKey(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.fixtures.schedule(orgId, body, idempotencyKey !== undefined ? { idempotencyKey } : {});
  const m = result.match;
  emit(ctx, { id: m.id, kickoff: m.scheduledAt, status: m.status }, result, `Fixture scheduled`);
  return { exitCode: 0 };
}

export async function fixtureShowCommand(ctx: CommandContext): Promise<CommandResult> {
  const matchId = ctx.args[0];
  if (matchId === undefined) throw new UsageError("usage: ogpic matchmaker fixture show <matchId>");
  const orgId = await resolveOrgId(ctx, false);
  const sdk = await ctx.sdk();
  const result = await sdk.fixtures.get(orgId, matchId);
  const m = result.match;
  emit(
    ctx,
    { id: m.id, kickoff: m.scheduledAt, status: m.status, teams: `${m.teamA.name} vs ${m.teamB.name}` },
    result,
    `Fixture ${m.id}`,
  );
  return { exitCode: 0 };
}

export async function fixtureShareCommand(ctx: CommandContext): Promise<CommandResult> {
  const matchId = ctx.args[0];
  if (matchId === undefined) throw new UsageError("usage: ogpic matchmaker fixture share <matchId>");
  const orgId = await resolveOrgId(ctx, false);
  const sdk = await ctx.sdk();
  const result = await sdk.fixtures.share(orgId, matchId);
  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }
  ctx.stdout(result.text);
  return { exitCode: 0 };
}

export async function fixtureResultCommand(ctx: CommandContext): Promise<CommandResult> {
  const matchId = ctx.args[0];
  if (matchId === undefined) {
    throw new UsageError("usage: ogpic matchmaker fixture result <matchId> --a=<goals> --b=<goals>");
  }
  const aRaw = flagString(ctx, "a");
  const bRaw = flagString(ctx, "b");
  if (aRaw === undefined || bRaw === undefined) throw new UsageError("--a and --b (goals) are required");
  const scoreA = Number(aRaw);
  const scoreB = Number(bRaw);
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    throw new UsageError("--a and --b must be non-negative integers");
  }
  const orgId = await resolveOrgId(ctx, false);
  const idempotencyKey = readIdempotencyKey(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.fixtures.update(
    orgId,
    matchId,
    { status: "played", scoreA, scoreB },
    idempotencyKey !== undefined ? { idempotencyKey } : {},
  );
  const m = result.match;
  emit(ctx, { id: m.id, status: m.status, score: `${m.scoreA}-${m.scoreB}` }, result, `Result recorded`);
  return { exitCode: 0 };
}

export async function fixtureCancelCommand(ctx: CommandContext): Promise<CommandResult> {
  const matchId = ctx.args[0];
  if (matchId === undefined) throw new UsageError("usage: ogpic matchmaker fixture cancel <matchId>");
  const orgId = await resolveOrgId(ctx, false);
  const idempotencyKey = readIdempotencyKey(ctx);
  const sdk = await ctx.sdk();
  const result = await sdk.fixtures.cancel(orgId, matchId, idempotencyKey !== undefined ? { idempotencyKey } : {});
  const m = result.match;
  emit(ctx, { id: m.id, status: m.status }, result, `Fixture cancelled`);
  return { exitCode: 0 };
}

// ── Availability ────────────────────────────────────────────────

export async function availabilityListCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const sdk = await ctx.sdk();
  const result = await sdk.availability.list(orgId);
  if (ctx.outputMode === "json") {
    ctx.stdout(formatOutput({ mode: "json", data: result }));
    return { exitCode: 0 };
  }
  const rows = result.availability.map((a) => ({
    playerId: a.playerId,
    state: a.state,
    updatedAt: a.updatedAt,
  }));
  ctx.stdout(
    formatOutput({ mode: "human", columns: ["playerId", "state", "updatedAt"], rows, title: `Availability in ${orgId}` }),
  );
  return { exitCode: 0 };
}

export async function availabilitySetCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const playerId = flagString(ctx, "player");
  const state = flagString(ctx, "state");
  if (!playerId) throw new UsageError("--player <playerId> is required");
  if (state !== "in" && state !== "maybe" && state !== "out") {
    throw new UsageError("--state must be one of: in, maybe, out");
  }
  const sdk = await ctx.sdk();
  const idempotencyKey = readIdempotencyKey(ctx);
  const result = await sdk.availability.set(orgId, playerId, { state }, idempotencyKey !== undefined ? { idempotencyKey } : {});
  emit(
    ctx,
    { playerId: result.availability.playerId, state: result.availability.state, updatedAt: result.availability.updatedAt },
    result,
    "Availability updated",
  );
  return { exitCode: 0 };
}

export async function playerCaptainCommand(ctx: CommandContext): Promise<CommandResult> {
  const orgId = await resolveOrgId(ctx, false);
  const playerId = flagString(ctx, "player");
  if (!playerId) throw new UsageError("--player <playerId> is required");
  const sdk = await ctx.sdk();
  const idempotencyKey = readIdempotencyKey(ctx);
  const result = await sdk.roster.setCaptain(orgId, playerId, idempotencyKey !== undefined ? { idempotencyKey } : {});
  emit(ctx, { id: result.player.id, name: result.player.name, captain: "true" }, result, "Captain set");
  return { exitCode: 0 };
}
