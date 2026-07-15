import { handleListMatchPayments, handleSetMatchPayment } from "@matchmaker-worker/handlers/match-payments";
import { asUuid } from "@saas/db/ids";
import type { MatchmakerRepository, MatchPayment } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const MATCH = asUuid("22222222-2222-2222-2222-222222222222");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const ACTOR = { subjectId: "usr_1", subjectType: "user" };

function repo(over: Partial<MatchmakerRepository> = {}): MatchmakerRepository {
  return {
    async listMatchPayments(): Promise<{ ok: true; value: MatchPayment[] }> {
      return { ok: true, value: [{ orgId: ORG, matchId: MATCH, playerId: PLAYER, paid: true, updatedAt: new Date() }] };
    },
    async setMatchPayment(orgId: string, matchId: string, playerId: string, paid: boolean, now: Date) {
      return { ok: true, value: { orgId, matchId, playerId, paid, updatedAt: now } };
    },
    ...over,
  } as unknown as MatchmakerRepository;
}

const allow = () => ({
  MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
  POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: true } }) },
  ENVIRONMENT: "test",
});
const deny = () => ({
  MEMBERSHIP_WORKER: { fetch: async () => Response.json({ data: { memberships: [] } }) },
  POLICY_WORKER: { fetch: async () => Response.json({ data: { allow: false } }) },
  ENVIRONMENT: "test",
});

function putReq(body: unknown): Request {
  return new Request("https://matchmaker.internal/x", { method: "PUT", body: JSON.stringify(body) });
}

describe("match payments handlers", () => {
  it("lists payments for a match", async () => {
    const res = await handleListMatchPayments(allow() as never, "r1", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { payments: { paid: boolean }[] } };
    expect(json.data.payments).toHaveLength(1);
    expect(json.data.payments[0]!.paid).toBe(true);
  });

  it("sets a player's paid flag", async () => {
    const res = await handleSetMatchPayment(putReq({ paid: true }), allow() as never, "r2", ACTOR, ORG, MATCH, PLAYER, { repo: repo() });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { payment: { paid: boolean } } };
    expect(json.data.payment.paid).toBe(true);
  });

  it("rejects a non-boolean paid with 422", async () => {
    const res = await handleSetMatchPayment(putReq({ paid: "yes" }), allow() as never, "r3", ACTOR, ORG, MATCH, PLAYER, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("denies write when policy rejects", async () => {
    const res = await handleSetMatchPayment(putReq({ paid: true }), deny() as never, "r4", ACTOR, ORG, MATCH, PLAYER, { repo: repo() });
    expect(res.status).toBe(404);
  });
});
