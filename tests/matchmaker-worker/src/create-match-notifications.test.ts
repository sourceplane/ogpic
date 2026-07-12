import { handleCreateMatch } from "@matchmaker-worker/handlers/create-match";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, Match, Player } from "@saas/db/matchmaker";
import type { EnqueueNotificationRequest } from "@saas/contracts/notifications";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function player(id: string, email: string | null): Player {
  return {
    id,
    orgId: ORG,
    name: `P-${id}`,
    position: "MID",
    rating: 60,
    attributes: { PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 },
    email,
    phone: null,
    status: "active",
    isCaptain: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
  };
}

function match(): Match {
  return {
    id: asUuid("22222222-2222-2222-2222-222222222222"),
    orgId: ORG,
    scheduledAt: new Date("2026-08-01T18:30:00.000Z"),
    status: "scheduled",
    format: null,
    teamA: { name: "Home", players: [], squadRating: 60 },
    teamB: { name: "Away", players: [], squadRating: 60 },
    ratingA: 60,
    ratingB: 60,
    scoreA: null,
    scoreB: null,
    venue: { name: "Riverside Astro", address: null, booked: false, mapsUrl: null },
    shareToken: "tok",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const ROSTER: Player[] = [
  player("11111111-1111-1111-1111-111111111111", "a@example.com"),
  player("33333333-3333-3333-3333-333333333333", null), // no email → skipped
  player("44444444-4444-4444-4444-444444444444", "b@example.com"),
];

function repo(): MatchmakerRepository {
  return {
    async createMatch() {
      return { ok: true, value: match() };
    },
    async listActivePlayers() {
      return { ok: true, value: ROSTER };
    },
  } as unknown as MatchmakerRepository;
}

function envAllowing(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) },
    ENVIRONMENT: "test",
    ...extra,
  };
}

function body() {
  return {
    scheduledAt: "2026-08-01T18:30:00.000Z",
    teamA: { name: "Home", players: [{ id: "p1", name: "A", position: "MID", rating: 60 }] },
    teamB: { name: "Away", players: [{ id: "p2", name: "B", position: "MID", rating: 60 }] },
    venue: { name: "Riverside Astro" },
  };
}

function req(): Request {
  return new Request("https://x/matches", { method: "POST", body: JSON.stringify(body()) });
}

describe("handleCreateMatch — availability-request emails", () => {
  it("enqueues an availability request to every player with an email", async () => {
    const calls: EnqueueNotificationRequest[] = [];
    const enqueueNotification = async (_env: unknown, _ctx: unknown, request: EnqueueNotificationRequest) => {
      calls.push(request);
      return { ok: true as const, notificationId: "ntf_x" };
    };
    const res = await handleCreateMatch(req(), envAllowing() as never, "req_1", ACTOR, ORG, {
      repo: repo(),
      enqueueNotification: enqueueNotification as never,
    });
    expect(res.status).toBe(201);
    expect(calls).toHaveLength(2); // the emailless player is skipped
    expect(calls.every((c) => c.templateKey === "match.availability_request")).toBe(true);
    expect(calls.every((c) => c.category === "product")).toBe(true);
    expect(calls.map((c) => c.recipient.address).sort()).toEqual(["a@example.com", "b@example.com"]);
    expect(calls[0]!.templateData?.venue).toBe("Riverside Astro");
    // Idempotency is per (match, player) → the two keys differ.
    expect(new Set(calls.map((c) => c.idempotencyKey)).size).toBe(2);
  });

  it("skips the enqueue entirely under DEBUG_DELIVERY", async () => {
    const calls: unknown[] = [];
    const enqueueNotification = async () => {
      calls.push(1);
      return { ok: true as const, notificationId: "ntf_x" };
    };
    const res = await handleCreateMatch(req(), envAllowing({ DEBUG_DELIVERY: "true" }) as never, "req_2", ACTOR, ORG, {
      repo: repo(),
      enqueueNotification: enqueueNotification as never,
    });
    expect(res.status).toBe(201);
    expect(calls).toHaveLength(0);
  });
});
