// Shared fixtures for the match-polls*.test.ts suite (polls, finalize, cron).
// New helper file per work-item instructions — does not edit any existing
// tests/matchmaker-worker helper.
import { asUuid } from "@saas/db/ids";
import type {
  ChatMessage,
  InsertChatMessageInput,
  Match,
  MatchmakerRepository,
  MatchPoll,
  MatchPollDetail,
  MatchPollOptionWithVotes,
  Player,
  UpdateMatchInput,
} from "@saas/db/matchmaker";

export const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
export const MATCH = asUuid("22222222-2222-2222-2222-222222222222");
export const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
export const PLAYER_2 = asUuid("33333333-3333-3333-3333-333333333333");
export const TIME_OPT = asUuid("44444444-4444-4444-4444-444444444444");
export const TIME_OPT_2 = asUuid("55555555-5555-5555-5555-555555555555");
export const TURF_OPT = asUuid("66666666-6666-6666-6666-666666666666");
export const TURF_OPT_2 = asUuid("77777777-7777-7777-7777-777777777777");
export const FOREIGN_OPT = asUuid("88888888-8888-8888-8888-888888888888");

export const ACTOR = { subjectId: "usr_1", subjectType: "user" };

export function player(overrides: Partial<Player> = {}): Player {
  return {
    id: PLAYER,
    orgId: ORG,
    name: "Sam Okafor",
    position: "MID",
    rating: 60,
    attributes: { PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 },
    email: "sam@example.com",
    phone: null,
    status: "active",
    isCaptain: false,
    subjectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...overrides,
  };
}

export function match(overrides: Partial<Match> = {}): Match {
  return {
    id: MATCH,
    orgId: ORG,
    scheduledAt: new Date("2026-08-01T18:30:00.000Z"),
    status: "poll",
    format: null,
    teamA: { name: "", players: [], squadRating: 0 },
    teamB: { name: "", players: [], squadRating: 0 },
    ratingA: 0,
    ratingB: 0,
    scoreA: null,
    scoreB: null,
    venue: { name: null, address: null, booked: false, mapsUrl: null },
    shareToken: "tok",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function timeOption(overrides: Partial<MatchPollOptionWithVotes> = {}): MatchPollOptionWithVotes {
  return {
    id: TIME_OPT,
    matchId: MATCH,
    orgId: ORG,
    kind: "time",
    label: "Fri, 7:30 PM",
    detail: null,
    startsAt: new Date("2026-08-01T18:30:00.000Z"),
    position: 0,
    createdAt: new Date(),
    voterPlayerIds: [],
    ...overrides,
  };
}

export function turfOption(overrides: Partial<MatchPollOptionWithVotes> = {}): MatchPollOptionWithVotes {
  return {
    id: TURF_OPT,
    matchId: MATCH,
    orgId: ORG,
    kind: "turf",
    label: "Riverside Turf",
    detail: "12 Riverside Rd",
    startsAt: null,
    position: 0,
    createdAt: new Date(),
    voterPlayerIds: [],
    ...overrides,
  };
}

export function pollHeader(overrides: Partial<MatchPoll> = {}): MatchPoll {
  return {
    matchId: MATCH,
    orgId: ORG,
    deadlineKind: "24h",
    deadlineAt: new Date("2026-08-02T18:30:00.000Z"),
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function pollDetail(
  overrides: Partial<MatchPoll> = {},
  options: MatchPollOptionWithVotes[] = [timeOption(), turfOption()],
): MatchPollDetail {
  return { poll: pollHeader(overrides), options };
}

/** Applies the same COALESCE-style semantics as the real repository's
 *  `updateMatch` (null field = leave unchanged) so handler tests observe the
 *  same merge behavior the SQL implementation guarantees. */
export function applyUpdateMatch(base: Match, input: UpdateMatchInput): Match {
  return {
    ...base,
    scheduledAt: input.scheduledAt ?? base.scheduledAt,
    status: input.status ?? base.status,
    scoreA: input.scoreA ?? base.scoreA,
    scoreB: input.scoreB ?? base.scoreB,
    venue: input.venue ?? base.venue,
    teamA: input.teamA ?? base.teamA,
    teamB: input.teamB ?? base.teamB,
    updatedAt: input.updatedAt,
  };
}

export function repo(over: Partial<MatchmakerRepository> = {}): MatchmakerRepository {
  return {
    async getPlayerById() {
      return { ok: true, value: player() };
    },
    async getPlayerBySubject() {
      return { ok: true, value: player({ subjectId: ACTOR.subjectId }) };
    },
    async getMatchById() {
      return { ok: true, value: match() };
    },
    async getMatchPoll() {
      return { ok: true, value: pollDetail() };
    },
    async listActivePlayers() {
      return { ok: true, value: [player()] };
    },
    async setPollVotes() {
      return { ok: true, value: undefined };
    },
    async closeMatchPoll() {
      return { ok: true, value: pollHeader({ closedAt: new Date() }) };
    },
    async updateMatch(_orgId: string, _matchId: string, input: UpdateMatchInput) {
      return { ok: true, value: applyUpdateMatch(match(), input) };
    },
    async insertChatMessage(input: InsertChatMessageInput) {
      return { ok: true, value: { ...input, reactions: {} } as ChatMessage };
    },
    async getOrgSettings() {
      return { ok: true, value: null };
    },
    async createMatch() {
      return { ok: true, value: match({ status: "scheduled" }) };
    },
    async createMatchPoll() {
      return { ok: true, value: pollDetail() };
    },
    async listDuePolls() {
      return { ok: true, value: [] };
    },
    ...over,
  } as unknown as MatchmakerRepository;
}

export function allowEnv(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) },
    ENVIRONMENT: "test",
    ...extra,
  };
}

export function denyEnv(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: false } }) },
    ENVIRONMENT: "test",
    ...extra,
  };
}

/** Allows only the named policy action (denies every other), so a test can
 *  assert *which* action a handler requested from policy-worker — the crux of
 *  the "manager playerId path requires organization.poll.manage" contract. */
export function envAllowingOnly(action: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: {
      fetch: async (_url: string, init?: RequestInit) => {
        const parsed = init?.body ? (JSON.parse(init.body as string) as { action?: string }) : {};
        return Response.json({ data: { allow: parsed.action === action } });
      },
    },
    ENVIRONMENT: "test",
    ...extra,
  };
}

export function jsonReq(method: string, body: unknown): Request {
  return new Request("https://matchmaker.internal/x", { method, body: JSON.stringify(body) });
}
