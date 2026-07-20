import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import type {
  CreateMatchPollOptionInput,
  MatchmakerRepository,
  MatchPollDetail,
  PollDeadlineKind,
} from "@saas/db/matchmaker";
import type { Uuid } from "@saas/db/ids";
import { asUuid } from "@saas/db/ids";
import { createMatchmakerRepository } from "@saas/db/matchmaker";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { requireOrgAction } from "../authz.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { toPublicMatch } from "../mappers.js";
import { playerPublicId, parsePlayerPublicId, pollOptionPublicId, parsePollOptionPublicId } from "../ids.js";

const LABEL_MAX = 80;
const DETAIL_MAX = 200;
const OPTION_IDS_MAX = 100;
const DEADLINE_KINDS: PollDeadlineKind[] = ["24h", "48h", "manual"];
const DEADLINE_MS: Record<Exclude<PollDeadlineKind, "manual">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "48h": 48 * 60 * 60 * 1000,
};
const OPTION_NOT_IN_POLL_MSG = "One or more option ids do not belong to this match's poll";

export interface MatchPollsDeps {
  repo?: MatchmakerRepository;
}

// ── Shared helpers (also used by create-match.ts and scheduled.ts) ─────────

/** A short, human label for a match used in chat notes (e.g. "Fri, 7:30 PM · Riverside Turf"). */
export function formatMatchLabel(scheduledAt: Date, venueName: string | null): string {
  const when = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(scheduledAt);
  return venueName ? `${when} · ${venueName}` : when;
}

export function pollClosedNoteBody(label: string): string {
  return `Poll closed — finalizing ${label}`;
}

/** `deadlineKind` -> the absolute deadline timestamp, or null for 'manual'. */
export function computeDeadlineAt(kind: PollDeadlineKind, now: Date): Date | null {
  if (kind === "manual") return null;
  return new Date(now.getTime() + DEADLINE_MS[kind]);
}

export interface ParsedPollTime {
  label: string;
  startsAt: Date | null;
}

export interface ParsedPollTurf {
  label: string;
  detail: string | null;
}

export interface ParsedPollInput {
  deadlineKind: PollDeadlineKind;
  times: ParsedPollTime[];
  turfs: ParsedPollTurf[];
}

/** Parse the `poll` block of a create-match request body (§4). Pushes field
 *  errors and returns null on any structural problem. */
export function parsePollInput(raw: unknown, fields: Record<string, string[]>): ParsedPollInput | null {
  if (!raw || typeof raw !== "object") {
    fields.poll = ["Must be an object with times, turfs, and deadline"];
    return null;
  }
  const p = raw as Record<string, unknown>;

  if (typeof p.deadline !== "string" || !DEADLINE_KINDS.includes(p.deadline as PollDeadlineKind)) {
    fields["poll.deadline"] = ["Must be one of: 24h, 48h, manual"];
  }
  if (!Array.isArray(p.times) || p.times.length === 0) {
    fields["poll.times"] = ["Must be a non-empty array of time options"];
  }
  if (!Array.isArray(p.turfs) || p.turfs.length === 0) {
    fields["poll.turfs"] = ["Must be a non-empty array of turf options"];
  }
  if (Object.keys(fields).length > 0) return null;

  const times: ParsedPollTime[] = [];
  for (const rawTime of p.times as unknown[]) {
    if (!rawTime || typeof rawTime !== "object") {
      fields["poll.times"] = ["Each time option must be an object"];
      return null;
    }
    const t = rawTime as Record<string, unknown>;
    if (typeof t.label !== "string" || t.label.trim().length < 1 || t.label.length > LABEL_MAX) {
      fields["poll.times"] = [`Each time option needs a label of 1–${LABEL_MAX} characters`];
      return null;
    }
    let startsAt: Date | null = null;
    if (t.startsAt !== undefined && t.startsAt !== null) {
      if (typeof t.startsAt !== "string" || Number.isNaN(Date.parse(t.startsAt))) {
        fields["poll.times"] = ["startsAt must be a valid ISO 8601 date-time"];
        return null;
      }
      startsAt = new Date(t.startsAt);
    }
    times.push({ label: t.label.trim(), startsAt });
  }

  const turfs: ParsedPollTurf[] = [];
  for (const rawTurf of p.turfs as unknown[]) {
    if (!rawTurf || typeof rawTurf !== "object") {
      fields["poll.turfs"] = ["Each turf option must be an object"];
      return null;
    }
    const t = rawTurf as Record<string, unknown>;
    if (typeof t.label !== "string" || t.label.trim().length < 1 || t.label.length > LABEL_MAX) {
      fields["poll.turfs"] = [`Each turf option needs a label of 1–${LABEL_MAX} characters`];
      return null;
    }
    let detail: string | null = null;
    if (t.detail !== undefined && t.detail !== null) {
      if (typeof t.detail !== "string" || t.detail.length > DETAIL_MAX) {
        fields["poll.turfs"] = [`detail must be a string of at most ${DETAIL_MAX} characters`];
        return null;
      }
      detail = t.detail.trim();
    }
    turfs.push({ label: t.label.trim(), detail });
  }

  return { deadlineKind: p.deadline as PollDeadlineKind, times, turfs };
}

/** Build the repo-shaped option rows for a parsed poll input (time options
 *  first, then turf options, each keeping its input order as `position`). */
export function buildPollOptionInputs(poll: ParsedPollInput): CreateMatchPollOptionInput[] {
  const options: CreateMatchPollOptionInput[] = [];
  poll.times.forEach((t, index) => {
    options.push({ id: crypto.randomUUID(), kind: "time", label: t.label, detail: null, startsAt: t.startsAt, position: index });
  });
  poll.turfs.forEach((t, index) => {
    options.push({ id: crypto.randomUUID(), kind: "turf", label: t.label, detail: t.detail, startsAt: null, position: index });
  });
  return options;
}

/** The earliest time option with a known start, or null when none was given. */
export function earliestStartsAt(poll: ParsedPollInput): Date | null {
  let earliest: Date | null = null;
  for (const t of poll.times) {
    if (t.startsAt && (!earliest || t.startsAt < earliest)) earliest = t.startsAt;
  }
  return earliest;
}

interface PublicPollOption {
  id: string;
  kind: string;
  label: string;
  detail: string | null;
  startsAt: string | null;
  votes: number;
  voterPlayerIds: string[];
}

function toPublicPollDetail(detail: MatchPollDetail, eligible: number) {
  const voters = new Set<string>();
  const options: PublicPollOption[] = detail.options.map((o) => {
    for (const voterId of o.voterPlayerIds) voters.add(voterId);
    return {
      id: pollOptionPublicId(o.id),
      kind: o.kind,
      label: o.label,
      detail: o.detail,
      startsAt: o.startsAt ? o.startsAt.toISOString() : null,
      votes: o.voterPlayerIds.length,
      voterPlayerIds: o.voterPlayerIds.map((id) => playerPublicId(id)),
    };
  });
  return {
    poll: {
      deadlineKind: detail.poll.deadlineKind,
      deadlineAt: detail.poll.deadlineAt ? detail.poll.deadlineAt.toISOString() : null,
      closedAt: detail.poll.closedAt ? detail.poll.closedAt.toISOString() : null,
    },
    options,
    voters: Array.from(voters, (id) => playerPublicId(id)),
    eligible,
  };
}

/** GET /v1/organizations/:orgId/matches/:matchId/poll — any member may view. */
export async function handleGetMatchPoll(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchPollsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.poll.vote");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const pollResult = await repo.getMatchPoll(orgId, matchId);
    if (!pollResult.ok) return errorResponse("not_found", "Not found", 404, requestId);
    const rosterResult = await repo.listActivePlayers(orgId);
    const eligible = rosterResult.ok ? rosterResult.value.length : 0;
    return successResponse(toPublicPollDetail(pollResult.value, eligible), requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

function parseSetVotesBody(
  body: unknown,
): { valid: true; optionIds: string[]; playerId: string | undefined } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const req = body as Record<string, unknown>;
  if (!Array.isArray(req.optionIds) || req.optionIds.some((id) => typeof id !== "string")) {
    return { valid: false, fields: { optionIds: ["Must be an array of option ids"] } };
  }
  if (req.optionIds.length > OPTION_IDS_MAX) {
    return { valid: false, fields: { optionIds: [`Must be at most ${OPTION_IDS_MAX} ids`] } };
  }
  let playerId: string | undefined;
  if (req.playerId !== undefined && req.playerId !== null) {
    if (typeof req.playerId !== "string") {
      return { valid: false, fields: { playerId: ["Must be a string"] } };
    }
    playerId = req.playerId;
  }
  return { valid: true, optionIds: req.optionIds as string[], playerId };
}

/**
 * PUT /v1/organizations/:orgId/matches/:matchId/poll/votes
 * Self-service: replaces the caller's own ballot. A manager may pass
 * `playerId` to vote on behalf of any roster player.
 */
export async function handleSetPollVotes(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchPollsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }
  const parsed = parseSetVotesBody(body);
  if (!parsed.valid) return validationError(requestId, parsed.fields);

  let requestedPlayerId: Uuid | null = null;
  if (parsed.playerId !== undefined) {
    requestedPlayerId = parsePlayerPublicId(parsed.playerId);
    if (!requestedPlayerId) return validationError(requestId, { playerId: ["Invalid player id"] });
  }
  const votingForOther = requestedPlayerId !== null;

  const denied = await requireOrgAction(
    env,
    requestId,
    actor,
    orgId,
    votingForOther ? "organization.poll.manage" : "organization.poll.vote",
  );
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);

    const targetResult = votingForOther
      ? await repo.getPlayerById(orgId, requestedPlayerId!)
      : await repo.getPlayerBySubject(orgId, actor.subjectId);
    if (!targetResult.ok) return errorResponse("not_found", "Not found", 404, requestId);
    const targetPlayer = targetResult.value;

    const pollBefore = await repo.getMatchPoll(orgId, matchId);
    if (!pollBefore.ok) return errorResponse("not_found", "Not found", 404, requestId);
    if (pollBefore.value.poll.closedAt !== null) {
      return errorResponse("conflict", "The poll is closed", 409, requestId);
    }
    const hadVotedBefore = pollBefore.value.options.some((o) => o.voterPlayerIds.includes(targetPlayer.id));

    const optionUuids: Uuid[] = [];
    for (const rawOptionId of parsed.optionIds) {
      const optionUuid = parsePollOptionPublicId(rawOptionId);
      if (!optionUuid) {
        return validationError(requestId, { optionIds: [OPTION_NOT_IN_POLL_MSG] });
      }
      optionUuids.push(optionUuid);
    }

    const now = new Date();
    const setResult = await repo.setPollVotes(orgId, matchId, asUuid(targetPlayer.id), optionUuids, now);
    if (!setResult.ok) {
      if (setResult.error.kind === "validation") {
        return validationError(requestId, { optionIds: [setResult.error.message] });
      }
      // A non-validation failure is a real server-side error (the write threw in
      // the repo). Log the preserved cause so the opaque 503 is diagnosable
      // instead of collapsing every write failure to a blank "Service unavailable".
      console.error(`[${requestId}] handleSetPollVotes: setPollVotes failed —`, setResult.error);
      return errorResponse("internal_error", "Service unavailable", 503, requestId);
    }

    const pollAfter = await repo.getMatchPoll(orgId, matchId);
    if (!pollAfter.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);

    const rosterResult = await repo.listActivePlayers(orgId);
    const eligible = rosterResult.ok ? rosterResult.value.length : 0;

    if (!hadVotedBefore && parsed.optionIds.length > 0) {
      const voters = new Set<string>();
      for (const option of pollAfter.value.options) {
        for (const voterId of option.voterPlayerIds) voters.add(voterId);
      }
      const matchResult = await repo.getMatchById(orgId, matchId);
      const label = matchResult.ok
        ? formatMatchLabel(matchResult.value.scheduledAt, matchResult.value.venue.name)
        : "the match";
      await repo.insertChatMessage({
        id: crypto.randomUUID(),
        orgId,
        kind: "note",
        body: `${targetPlayer.name} voted on ${label} · ${voters.size}/${eligible}`,
        matchId,
        authorPlayerId: asUuid(targetPlayer.id),
        authorSubjectId: votingForOther ? null : actor.subjectId,
        authorName: targetPlayer.name,
        createdAt: now,
      });
    }

    return successResponse(toPublicPollDetail(pollAfter.value, eligible), requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

/** POST /v1/organizations/:orgId/matches/:matchId/poll/close — manager only. */
export async function handleClosePoll(
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchPollsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }
  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.poll.manage");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const matchResult = await repo.getMatchById(orgId, matchId);
    if (!matchResult.ok) return errorResponse("not_found", "Not found", 404, requestId);
    if (matchResult.value.status !== "poll") {
      return errorResponse("conflict", "Match is not open for poll voting", 409, requestId);
    }

    const now = new Date();
    const closed = await repo.closeMatchPoll(orgId, matchId, now);
    if (!closed.ok) {
      if (closed.error.kind === "not_found") return errorResponse("not_found", "Not found", 404, requestId);
      return errorResponse("conflict", "The poll is already closed", 409, requestId);
    }

    const updated = await repo.updateMatch(orgId, matchId, {
      scheduledAt: null,
      status: "finalizing",
      scoreA: null,
      scoreB: null,
      venue: null,
      teamA: null,
      teamB: null,
      updatedAt: now,
    });
    if (!updated.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);

    const label = formatMatchLabel(updated.value.scheduledAt, updated.value.venue.name);
    await repo.insertChatMessage({
      id: crypto.randomUUID(),
      orgId,
      kind: "note",
      body: pollClosedNoteBody(label),
      matchId,
      authorPlayerId: null,
      authorSubjectId: actor.subjectId,
      authorName: null,
      createdAt: now,
    });

    return successResponse({ match: toPublicMatch(updated.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}

function parseFinalizeBody(
  body: unknown,
): { valid: true; timeOptionId: string; turfOptionId: string } | { valid: false; fields: Record<string, string[]> } {
  if (!body || typeof body !== "object") {
    return { valid: false, fields: { body: ["Request body must be an object"] } };
  }
  const req = body as Record<string, unknown>;
  const fields: Record<string, string[]> = {};
  if (typeof req.timeOptionId !== "string" || req.timeOptionId.length === 0) {
    fields.timeOptionId = ["Must be a string"];
  }
  if (typeof req.turfOptionId !== "string" || req.turfOptionId.length === 0) {
    fields.turfOptionId = ["Must be a string"];
  }
  if (Object.keys(fields).length > 0) return { valid: false, fields };
  return { valid: true, timeOptionId: req.timeOptionId as string, turfOptionId: req.turfOptionId as string };
}

/**
 * POST /v1/organizations/:orgId/matches/:matchId/finalize — manager only.
 * Picks the winning time/turf options and moves the match to 'draft'.
 */
export async function handleFinalizeMatch(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
  orgId: Uuid,
  matchId: Uuid,
  deps?: MatchPollsDeps,
): Promise<Response> {
  if (!env.PLATFORM_DB && !deps?.repo) {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError(requestId, { body: ["Invalid JSON"] });
  }
  const parsed = parseFinalizeBody(body);
  if (!parsed.valid) return validationError(requestId, parsed.fields);

  const denied = await requireOrgAction(env, requestId, actor, orgId, "organization.poll.manage");
  if (denied) return denied;

  const executor = deps?.repo ? null : createSqlExecutor(env.PLATFORM_DB!);
  try {
    const repo = deps?.repo ?? createMatchmakerRepository(executor!);
    const matchResult = await repo.getMatchById(orgId, matchId);
    if (!matchResult.ok) return errorResponse("not_found", "Not found", 404, requestId);
    const match = matchResult.value;

    const pollResult = await repo.getMatchPoll(orgId, matchId);
    if (!pollResult.ok) return errorResponse("not_found", "Not found", 404, requestId);

    const ready = match.status === "finalizing" || (match.status === "poll" && pollResult.value.poll.closedAt !== null);
    if (!ready) {
      return errorResponse("conflict", "Match is not ready to finalize", 409, requestId);
    }

    const timeOptionUuid = parsePollOptionPublicId(parsed.timeOptionId);
    const timeOption = timeOptionUuid
      ? pollResult.value.options.find((o) => o.id === timeOptionUuid && o.kind === "time")
      : undefined;
    if (!timeOption) {
      return validationError(requestId, { timeOptionId: ["Does not belong to this match's poll"] });
    }
    const turfOptionUuid = parsePollOptionPublicId(parsed.turfOptionId);
    const turfOption = turfOptionUuid
      ? pollResult.value.options.find((o) => o.id === turfOptionUuid && o.kind === "turf")
      : undefined;
    if (!turfOption) {
      return validationError(requestId, { turfOptionId: ["Does not belong to this match's poll"] });
    }

    const now = new Date();
    const updated = await repo.updateMatch(orgId, matchId, {
      // Fallback: a time option without a fixed start leaves the provisional
      // scheduled_at from creation untouched (COALESCE in the repo).
      scheduledAt: timeOption.startsAt,
      status: "draft",
      scoreA: null,
      scoreB: null,
      venue: {
        name: turfOption.label,
        address: turfOption.detail,
        booked: match.venue.booked,
        mapsUrl: match.venue.mapsUrl,
      },
      teamA: null,
      teamB: null,
      updatedAt: now,
    });
    if (!updated.ok) return errorResponse("internal_error", "Service unavailable", 503, requestId);

    return successResponse({ match: toPublicMatch(updated.value) }, requestId);
  } catch {
    return errorResponse("internal_error", "Service unavailable", 503, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
