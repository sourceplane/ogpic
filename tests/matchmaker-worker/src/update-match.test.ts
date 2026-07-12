import { handleUpdateMatch } from "@matchmaker-worker/handlers/update-match";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, Match, UpdateMatchInput } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const MATCH = asUuid("22222222-2222-2222-2222-222222222222");
const ACTOR = { subjectId: "usr_m", subjectType: "user" };

function match(): Match {
  return {
    id: MATCH,
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
    venue: { name: "The Cage", address: null, booked: false, mapsUrl: null },
    shareToken: "tok",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

let lastInput: UpdateMatchInput | null = null;
function repo(): MatchmakerRepository {
  return {
    async updateMatch(_org: string, _id: string, input: UpdateMatchInput) {
      lastInput = input;
      return { ok: true, value: match() };
    },
  } as unknown as MatchmakerRepository;
}

function envAllowing(): Record<string, unknown> {
  return {
    MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
    POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) },
    ENVIRONMENT: "test",
  };
}
function req(body: unknown): Request {
  return new Request("https://x/matches/x", { method: "PATCH", body: JSON.stringify(body) });
}
const TEAM = (name: string) => ({ name, players: [{ id: "p1", name: "A", position: "MID", rating: 70 }] });

describe("handleUpdateMatch — line-up edits + maps venue", () => {
  beforeEach(() => {
    lastInput = null;
  });

  it("edits both line-ups together", async () => {
    const res = await handleUpdateMatch(req({ teamA: TEAM("Reds"), teamB: TEAM("Blues") }), envAllowing() as never, "r1", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastInput?.teamA?.name).toBe("Reds");
    expect(lastInput?.teamB?.name).toBe("Blues");
    expect(lastInput?.teamA?.squadRating).toBe(70);
  });

  it("422s when only one team is supplied", async () => {
    const res = await handleUpdateMatch(req({ teamA: TEAM("Reds") }), envAllowing() as never, "r2", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("sets a Google Maps venue location", async () => {
    const res = await handleUpdateMatch(req({ venue: { name: "Dome", mapsUrl: "https://maps.google.com/?q=1,2" } }), envAllowing() as never, "r3", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastInput?.venue?.mapsUrl).toBe("https://maps.google.com/?q=1,2");
  });

  it("422s an empty update", async () => {
    const res = await handleUpdateMatch(req({}), envAllowing() as never, "r4", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(422);
  });
});
