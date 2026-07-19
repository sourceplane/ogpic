import { handleCreateMatch } from "@matchmaker-worker/handlers/create-match";
import type { CreateMatchInput, CreateMatchPollInput, InsertChatMessageInput, UpdateMatchInput } from "@saas/db/matchmaker";
import { ACTOR, ORG, allowEnv, denyEnv, match, repo } from "./match-polls-fixtures.js";

function pollBody(overrides: Record<string, unknown> = {}) {
  return {
    poll: {
      deadline: "24h",
      times: [
        { label: "Fri, 7:30 PM", startsAt: "2026-08-01T19:30:00.000Z" },
        { label: "Sat, 6:00 PM", startsAt: "2026-08-02T18:00:00.000Z" },
      ],
      turfs: [{ label: "Riverside Turf", detail: "12 Riverside Rd" }],
    },
    ...overrides,
  };
}

function req(body: Record<string, unknown>): Request {
  return new Request("https://x/matches", { method: "POST", body: JSON.stringify(body) });
}

describe("handleCreateMatch — poll block (v5)", () => {
  it("starts the match at status 'poll' with the provisional scheduledAt = earliest time option's startsAt", async () => {
    const createCalls: CreateMatchInput[] = [];
    let statusUpdatedTo: string | null | undefined;
    const r = repo({
      async createMatch(input: CreateMatchInput) {
        createCalls.push(input);
        return { ok: true, value: match({ scheduledAt: input.scheduledAt, status: "scheduled" }) };
      },
      async updateMatch(_o: string, _m: string, input: UpdateMatchInput) {
        statusUpdatedTo = input.status;
        return { ok: true, value: match({ status: "poll" }) };
      },
    });
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r1", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { data: { match: { status: string } } };
    expect(json.data.match.status).toBe("poll");
    expect(statusUpdatedTo).toBe("poll");
    // Earliest of the two time options, not the later Saturday one.
    expect(createCalls[0]!.scheduledAt.toISOString()).toBe("2026-08-01T19:30:00.000Z");
  });

  it("falls back to an explicit scheduledAt when no time option carries a startsAt", async () => {
    const createCalls: CreateMatchInput[] = [];
    const r = repo({
      async createMatch(input: CreateMatchInput) {
        createCalls.push(input);
        return { ok: true, value: match({ scheduledAt: input.scheduledAt, status: "scheduled" }) };
      },
    });
    const body = pollBody({
      scheduledAt: "2026-08-05T12:00:00.000Z",
      poll: { deadline: "manual", times: [{ label: "TBD" }], turfs: [{ label: "TBD turf" }] },
    });
    const res = await handleCreateMatch(req(body), allowEnv() as never, "r2", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    expect(createCalls[0]!.scheduledAt.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("422s when there's a poll but neither a startsAt time option nor an explicit scheduledAt", async () => {
    const body = pollBody({ poll: { deadline: "manual", times: [{ label: "TBD" }], turfs: [{ label: "TBD turf" }] } });
    const res = await handleCreateMatch(req(body), allowEnv() as never, "r3", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { details: { fields: Record<string, string[]> } } };
    expect(json.error.details.fields.scheduledAt).toBeDefined();
  });

  it("posts a 'poll' kind chat card leading with the first time option's label", async () => {
    const chats: InsertChatMessageInput[] = [];
    const r = repo({
      async insertChatMessage(input: InsertChatMessageInput) {
        chats.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r4", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    const card = chats.find((c) => c.kind === "poll");
    expect(card).toBeDefined();
    expect(card!.body).toContain("Fri, 7:30 PM");
  });

  it("does NOT post a WhatsApp mirror note when the org's bridge is off (default)", async () => {
    const chats: InsertChatMessageInput[] = [];
    const r = repo({
      async getOrgSettings() {
        return { ok: true, value: null };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        chats.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r5", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    expect(chats.some((c) => c.kind === "note")).toBe(false);
  });

  it("posts a WhatsApp mirror note when the org's bridge is on", async () => {
    const chats: InsertChatMessageInput[] = [];
    const r = repo({
      async getOrgSettings() {
        return { ok: true, value: { orgId: ORG, whatsappBridge: true, updatedAt: new Date() } };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        chats.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r6", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    const note = chats.find((c) => c.kind === "note");
    expect(note).toBeDefined();
    expect(note!.body.toLowerCase()).toContain("whatsapp");
  });

  it("skips the poll card + WA note (but keeps the match at status poll) when createMatchPoll conflicts", async () => {
    const chats: unknown[] = [];
    const r = repo({
      async createMatchPoll() {
        return { ok: false, error: { kind: "conflict", entity: "match_poll" } };
      },
      async insertChatMessage(input: InsertChatMessageInput) {
        chats.push(input);
        return { ok: true, value: { ...input, reactions: {} } as never };
      },
    });
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r7", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    expect(chats).toHaveLength(0);
  });

  it("does not enqueue the generic availability-request notification for a polled match", async () => {
    const calls: unknown[] = [];
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r8", ACTOR, ORG, {
      repo: repo(),
      enqueueNotification: (async (..._args: unknown[]) => {
        calls.push(1);
        return { ok: true, notificationId: "x" };
      }) as never,
    });
    expect(res.status).toBe(201);
    expect(calls).toHaveLength(0);
  });

  it("422s on poll validation errors (empty times array)", async () => {
    const body = pollBody({ poll: { deadline: "24h", times: [], turfs: [{ label: "T" }] } });
    const res = await handleCreateMatch(req(body), allowEnv() as never, "r9", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { details: { fields: Record<string, string[]> } } };
    expect(json.error.details.fields["poll.times"]).toBeDefined();
  });

  it("422s on an invalid deadline kind", async () => {
    const body = pollBody({ poll: { deadline: "1week", times: [{ label: "T" }], turfs: [{ label: "T" }] } });
    const res = await handleCreateMatch(req(body), allowEnv() as never, "r10", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { details: { fields: Record<string, string[]> } } };
    expect(json.error.details.fields["poll.deadline"]).toBeDefined();
  });

  it("404s (opaque) when policy denies organization.fixture.write", async () => {
    const res = await handleCreateMatch(req(pollBody()), denyEnv() as never, "r11", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });

  // Documents the exact CreateMatchPollInput shape the handler hands the repo,
  // per §4 of the spec (times first then turfs, positions preserved).
  it("builds the poll options in times-then-turfs order with 0-based positions", async () => {
    let created: CreateMatchPollInput | null = null;
    const r = repo({
      async createMatchPoll(input: CreateMatchPollInput) {
        created = input;
        return { ok: true, value: { poll: { matchId: input.matchId, orgId: input.orgId, deadlineKind: input.deadlineKind, deadlineAt: input.deadlineAt, closedAt: null, createdAt: new Date(), updatedAt: new Date() }, options: [] } };
      },
    });
    const res = await handleCreateMatch(req(pollBody()), allowEnv() as never, "r12", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(201);
    expect(created).not.toBeNull();
    const opts = created!.options;
    expect(opts.map((o) => o.kind)).toEqual(["time", "time", "turf"]);
    expect(opts.map((o) => o.position)).toEqual([0, 1, 0]);
  });
});
