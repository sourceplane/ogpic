import { sendAvailabilityRemindersFor } from "@matchmaker-worker/scheduled";
import { asUuid } from "@saas/db/ids";
import type { Match, MatchmakerRepository, Player, Availability } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");

function player(id: string, over: Partial<Player> = {}): Player {
  return {
    id: asUuid(`11111111-1111-1111-1111-${id.padStart(12, "0")}`),
    orgId: ORG,
    name: `P${id}`,
    position: "MID",
    rating: 60,
    attributes: {},
    email: `${id}@ex.com`,
    phone: null,
    status: "active",
    isCaptain: false,
    subjectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...over,
  };
}

function match(): Match {
  return {
    id: asUuid("22222222-2222-2222-2222-222222222222"),
    orgId: ORG,
    scheduledAt: new Date("2026-07-15T18:00:00Z"),
    status: "scheduled",
    format: null,
    teamA: { name: "A", players: [], squadRating: 0 },
    teamB: { name: "B", players: [], squadRating: 0 },
    ratingA: 0,
    ratingB: 0,
    scoreA: null,
    scoreB: null,
    venue: { name: "Riverside", address: null, booked: false, mapsUrl: null },
    shareToken: "tok",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function repo(players: Player[], avail: Availability[]): MatchmakerRepository {
  return {
    async listActivePlayers() {
      return { ok: true, value: players };
    },
    async listAvailability() {
      return { ok: true, value: avail };
    },
  } as unknown as MatchmakerRepository;
}

describe("sendAvailabilityRemindersFor", () => {
  it("reminds only players who haven't confirmed 'in', over their contacts", async () => {
    const p1 = player("1", { email: "1@ex.com", phone: "+100" }); // in → skip
    const p2 = player("2", { email: "2@ex.com", phone: null }); // maybe → email only
    const p3 = player("3", { email: null, phone: null }); // no contacts → nothing
    const avail: Availability[] = [{ orgId: ORG, playerId: p1.id, state: "in", updatedAt: new Date() }];

    const calls: unknown[] = [];
    const enqueue = (async (_env: unknown, _ctx: unknown, req: unknown) => {
      calls.push(req);
      return { ok: true } as never;
    }) as never;

    const sent = await sendAvailabilityRemindersFor({} as never, repo([p1, p2, p3], avail), enqueue, [match()]);

    expect(sent).toBe(1);
    expect(calls).toHaveLength(1);
    const req = calls[0] as { recipient: { channel: string; address: string }; idempotencyKey: string };
    expect(req.recipient.channel).toBe("email");
    expect(req.recipient.address).toBe("2@ex.com");
    expect(req.idempotencyKey).toContain("match.availability_reminder");
  });

  it("sends nothing when everyone is already in", async () => {
    const p1 = player("1");
    const avail: Availability[] = [{ orgId: ORG, playerId: p1.id, state: "in", updatedAt: new Date() }];
    const enqueue = (async () => ({ ok: true } as never)) as never;
    const sent = await sendAvailabilityRemindersFor({} as never, repo([p1], avail), enqueue, [match()]);
    expect(sent).toBe(0);
  });
});
