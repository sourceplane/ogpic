import { handleChatList, handleChatPost, handleChatReact } from "@matchmaker-worker/handlers/chat";
import { chatMessagePublicId } from "@matchmaker-worker/ids";
import { asUuid } from "@saas/db/ids";
import type { ChatMessage, ListChatMessagesParams, MatchmakerRepository, Player } from "@saas/db/matchmaker";

const ORG = asUuid("00000000-0000-0000-0000-0000000000aa");
const PLAYER = asUuid("11111111-1111-1111-1111-111111111111");
const MESSAGE = asUuid("33333333-3333-3333-3333-333333333333");
const ACTOR = { subjectId: "usr_1", subjectType: "user", email: "sam.okafor@example.com" };

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: PLAYER,
    orgId: ORG,
    name: "Sam Okafor",
    position: "MID",
    rating: 60,
    attributes: { PAC: 60, SHO: 60, PAS: 60, DRI: 60, DEF: 60, PHY: 60 },
    email: "sam.okafor@example.com",
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

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: MESSAGE,
    orgId: ORG,
    kind: "text",
    body: "hello squad",
    matchId: null,
    authorPlayerId: null,
    authorSubjectId: "usr_1",
    authorName: "sam.okafor",
    reactions: {},
    createdAt: new Date("2026-07-19T10:00:00.000Z"),
    ...overrides,
  };
}

let lastListParams: ListChatMessagesParams | null = null;
let lastInsert: unknown = null;

function repo(over: Partial<MatchmakerRepository> = {}): MatchmakerRepository {
  return {
    async listChatMessages(_orgId: string, params: ListChatMessagesParams) {
      lastListParams = params;
      return { ok: true, value: [message()] };
    },
    async insertChatMessage(input: unknown) {
      lastInsert = input;
      const i = input as ChatMessage;
      return { ok: true, value: message({ ...i, id: MESSAGE }) };
    },
    async getPlayerBySubject() {
      return { ok: false, error: { kind: "not_found" } };
    },
    async toggleChatReaction() {
      return { ok: true, value: message({ reactions: { "⚽": ["usr_1"] } }) };
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

function getReq(qs = ""): Request {
  return new Request(`https://matchmaker.internal/v1/organizations/org_x/chat${qs}`, { method: "GET" });
}
function postReq(body: unknown): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
function reactReq(body: unknown): Request {
  return new Request("https://matchmaker.internal/v1/organizations/org_x/chat/cht_x/reactions", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  lastListParams = null;
  lastInsert = null;
});

describe("handleChatList", () => {
  it("returns the feed newest-first as supplied by the repository", async () => {
    const newer = message({ id: asUuid("44444444-4444-4444-4444-444444444444"), body: "newer", createdAt: new Date("2026-07-19T12:00:00.000Z") });
    const older = message({ id: asUuid("33333333-3333-3333-3333-333333333333"), body: "older", createdAt: new Date("2026-07-19T09:00:00.000Z") });
    const r = repo({ async listChatMessages() { return { ok: true, value: [newer, older] }; } });
    const res = await handleChatList(getReq(), allow() as never, "r1", ACTOR, ORG, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { messages: { body: string }[] } };
    expect(json.data.messages.map((m) => m.body)).toEqual(["newer", "older"]);
  });

  it("defaults to limit 50 with no before cursor", async () => {
    const res = await handleChatList(getReq(), allow() as never, "r2", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastListParams).toEqual({ limit: 50, before: null });
  });

  it("accepts a limit at the lower bound (1)", async () => {
    const res = await handleChatList(getReq("?limit=1"), allow() as never, "r3", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastListParams?.limit).toBe(1);
  });

  it("accepts a limit at the upper bound (100)", async () => {
    const res = await handleChatList(getReq("?limit=100"), allow() as never, "r4", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastListParams?.limit).toBe(100);
  });

  it("422s a limit of 0", async () => {
    const res = await handleChatList(getReq("?limit=0"), allow() as never, "r5", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("422s a limit above 100", async () => {
    const res = await handleChatList(getReq("?limit=101"), allow() as never, "r6", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("422s a non-integer limit", async () => {
    const res = await handleChatList(getReq("?limit=12.5"), allow() as never, "r7", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("parses a valid `before` cursor", async () => {
    const res = await handleChatList(getReq("?before=2026-07-19T09:00:00.000Z"), allow() as never, "r8", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(200);
    expect(lastListParams?.before?.toISOString()).toBe("2026-07-19T09:00:00.000Z");
  });

  it("422s an invalid `before` cursor", async () => {
    const res = await handleChatList(getReq("?before=not-a-date"), allow() as never, "r9", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("denies (opaque 404) when the actor lacks chat.read", async () => {
    const res = await handleChatList(getReq(), deny() as never, "r10", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });

  it("validates query params before checking RBAC", async () => {
    // Bad input should 422 even under a denying policy — validation runs first.
    const res = await handleChatList(getReq("?limit=0"), deny() as never, "r11", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });
});

describe("handleChatPost", () => {
  it("posts a trimmed text message", async () => {
    const res = await handleChatPost(postReq({ body: "  hello squad  " }), allow() as never, "r20", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(201);
    expect((lastInsert as { body: string }).body).toBe("hello squad");
    const json = (await res.json()) as { data: { message: { body: string; kind: string } } };
    expect(json.data.message.body).toBe("hello squad");
    expect(json.data.message.kind).toBe("text");
  });

  it("resolves the author to the claimed roster player's name when present", async () => {
    const r = repo({ async getPlayerBySubject() { return { ok: true, value: player({ name: "Sam Okafor" }) }; } });
    await handleChatPost(postReq({ body: "hi" }), allow() as never, "r21", ACTOR, ORG, { repo: r });
    const insert = lastInsert as { authorPlayerId: string | null; authorName: string };
    expect(insert.authorPlayerId).toBe(PLAYER);
    expect(insert.authorName).toBe("Sam Okafor");
  });

  it("falls back to the account email's local-part when unclaimed", async () => {
    const res = await handleChatPost(postReq({ body: "hi" }), allow() as never, "r22", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(201);
    const insert = lastInsert as { authorPlayerId: string | null; authorName: string };
    expect(insert.authorPlayerId).toBeNull();
    expect(insert.authorName).toBe("sam.okafor");
  });

  it("rejects a body under the minimum length (empty after trim)", async () => {
    const res = await handleChatPost(postReq({ body: "   " }), allow() as never, "r23", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("rejects a body over 2000 characters", async () => {
    const res = await handleChatPost(postReq({ body: "x".repeat(2001) }), allow() as never, "r24", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("accepts a body at exactly 2000 characters", async () => {
    const res = await handleChatPost(postReq({ body: "x".repeat(2000) }), allow() as never, "r25", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(201);
  });

  it("rejects a missing body field", async () => {
    const res = await handleChatPost(postReq({}), allow() as never, "r26", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("rejects a non-string body", async () => {
    const res = await handleChatPost(postReq({ body: 42 }), allow() as never, "r27", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("422s invalid JSON", async () => {
    const req = new Request("https://matchmaker.internal/v1/organizations/org_x/chat", { method: "POST", body: "{not json" });
    const res = await handleChatPost(req, allow() as never, "r28", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("denies (opaque 404) when the actor lacks chat.post", async () => {
    const res = await handleChatPost(postReq({ body: "hi" }), deny() as never, "r29", ACTOR, ORG, { repo: repo() });
    expect(res.status).toBe(404);
  });
});

describe("handleChatReact", () => {
  it("toggles a reaction on", async () => {
    const r = repo({ async toggleChatReaction() { return { ok: true, value: message({ reactions: { "⚽": ["usr_1"] } }) }; } });
    const res = await handleChatReact(reactReq({ emoji: "⚽" }), allow() as never, "r30", ACTOR, ORG, MESSAGE, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { message: { reactions: Record<string, string[]> } } };
    expect(json.data.message.reactions["⚽"]).toEqual(["usr_1"]);
  });

  it("toggles a reaction off and shows the empty key removed from the response", async () => {
    const r = repo({ async toggleChatReaction() { return { ok: true, value: message({ reactions: {} }) }; } });
    const res = await handleChatReact(reactReq({ emoji: "⚽" }), allow() as never, "r31", ACTOR, ORG, MESSAGE, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { message: { reactions: Record<string, string[]> } } };
    expect(json.data.message.reactions["⚽"]).toBeUndefined();
    expect(Object.keys(json.data.message.reactions)).toHaveLength(0);
  });

  it("404s for an unknown message", async () => {
    const r = repo({ async toggleChatReaction() { return { ok: false, error: { kind: "not_found" } }; } });
    const res = await handleChatReact(reactReq({ emoji: "⚽" }), allow() as never, "r32", ACTOR, ORG, MESSAGE, { repo: r });
    expect(res.status).toBe(404);
  });

  it("rejects an empty emoji", async () => {
    const res = await handleChatReact(reactReq({ emoji: "" }), allow() as never, "r33", ACTOR, ORG, MESSAGE, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("rejects an emoji over 8 characters", async () => {
    const res = await handleChatReact(reactReq({ emoji: "x".repeat(9) }), allow() as never, "r34", ACTOR, ORG, MESSAGE, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("rejects a missing emoji field", async () => {
    const res = await handleChatReact(reactReq({}), allow() as never, "r35", ACTOR, ORG, MESSAGE, { repo: repo() });
    expect(res.status).toBe(422);
  });

  it("echoes the public message id", async () => {
    const res = await handleChatReact(reactReq({ emoji: "⚽" }), allow() as never, "r36", ACTOR, ORG, MESSAGE, { repo: repo() });
    const json = (await res.json()) as { data: { message: { id: string } } };
    expect(json.data.message.id).toBe(chatMessagePublicId(MESSAGE));
  });

  it("denies (opaque 404) when the actor lacks chat.post", async () => {
    const res = await handleChatReact(reactReq({ emoji: "⚽" }), deny() as never, "r37", ACTOR, ORG, MESSAGE, { repo: repo() });
    expect(res.status).toBe(404);
  });
});
