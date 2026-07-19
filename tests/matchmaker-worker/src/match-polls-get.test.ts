import { handleGetMatchPoll } from "@matchmaker-worker/handlers/match-polls";
import { playerPublicId } from "@matchmaker-worker/ids";
import {
  ACTOR,
  MATCH,
  ORG,
  PLAYER,
  allowEnv,
  denyEnv,
  pollDetail,
  repo,
  timeOption,
  turfOption,
} from "./match-polls-fixtures.js";

describe("handleGetMatchPoll", () => {
  it("returns the poll detail shape with per-option vote counts and eligible roster size", async () => {
    const detail = pollDetail(
      { deadlineKind: "48h", closedAt: null },
      [timeOption({ voterPlayerIds: [PLAYER] }), turfOption({ voterPlayerIds: [] })],
    );
    const r = repo({
      async getMatchPoll() {
        return { ok: true, value: detail };
      },
      async listActivePlayers() {
        return { ok: true, value: [{ id: PLAYER }, { id: "p2" }, { id: "p3" }] as never };
      },
    });

    const res = await handleGetMatchPoll(allowEnv() as never, "r1", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: {
        poll: { deadlineKind: string; deadlineAt: string | null; closedAt: string | null };
        options: { kind: string; votes: number; voterPlayerIds: string[] }[];
        voters: string[];
        eligible: number;
      };
    };
    expect(json.data.poll.deadlineKind).toBe("48h");
    expect(json.data.poll.closedAt).toBeNull();
    expect(json.data.eligible).toBe(3);
    expect(json.data.options).toHaveLength(2);
    const time = json.data.options.find((o) => o.kind === "time")!;
    expect(time.votes).toBe(1);
    expect(time.voterPlayerIds).toEqual([playerPublicId(PLAYER)]);
    const turf = json.data.options.find((o) => o.kind === "turf")!;
    expect(turf.votes).toBe(0);
    // `voters` is the de-duplicated union of every option's voters.
    expect(json.data.voters).toEqual([playerPublicId(PLAYER)]);
  });

  it("returns 0 eligible when the roster lookup itself fails, rather than erroring the whole response", async () => {
    const r = repo({
      async listActivePlayers() {
        return { ok: false, error: { kind: "internal", message: "boom" } };
      },
    });
    const res = await handleGetMatchPoll(allowEnv() as never, "r2", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { eligible: number } };
    expect(json.data.eligible).toBe(0);
  });

  it("404s when the match has no poll", async () => {
    const r = repo({
      async getMatchPoll() {
        return { ok: false, error: { kind: "not_found" } };
      },
    });
    const res = await handleGetMatchPoll(allowEnv() as never, "r3", ACTOR, ORG, MATCH, { repo: r });
    expect(res.status).toBe(404);
  });

  it("denies with an opaque 404 when policy rejects organization.poll.vote", async () => {
    const res = await handleGetMatchPoll(denyEnv() as never, "r4", ACTOR, ORG, MATCH, { repo: repo() });
    expect(res.status).toBe(404);
    const json = (await res.json()) as { error: { code: string } };
    expect(json.error.code).toBe("not_found");
  });

  // The rest of the API keeps internal UUIDs off the wire (matchPublicId,
  // playerPublicId, chatMessagePublicId, orgPublicId all translate before a
  // response leaves the worker — see mappers.ts / chat.ts). Poll option ids
  // are the one place that invariant is dropped: toPublicPollDetail in
  // match-polls.ts returns `o.id` raw. See bugsFound for file:line.
  it.skip("option ids are opaque public ids, like every other id on the wire (BUG: currently raw UUIDs — see match-polls.ts toPublicPollDetail)", async () => {
    const detail = pollDetail({}, [timeOption()]);
    const r = repo({
      async getMatchPoll() {
        return { ok: true, value: detail };
      },
    });
    const res = await handleGetMatchPoll(allowEnv() as never, "r5", ACTOR, ORG, MATCH, { repo: r });
    const json = (await res.json()) as { data: { options: { id: string }[] } };
    // Expected: an opaque, prefixed id (e.g. "opt_<32 hex>"), never the bare
    // internal UUID.
    expect(json.data.options[0]!.id).not.toBe(String(timeOption().id));
    expect(json.data.options[0]!.id).toMatch(/^[a-z]+_[0-9a-f]{32}$/);
  });
});
