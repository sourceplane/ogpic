import { handleFinalizeMatch } from "@matchmaker-worker/handlers/match-polls";
import { pollOptionPublicId } from "@matchmaker-worker/ids";
import type { UpdateMatchInput } from "@saas/db/matchmaker";
import {
  ACTOR,
  FOREIGN_OPT,
  MATCH,
  ORG,
  TIME_OPT,
  TURF_OPT,
  allowEnv,
  denyEnv,
  jsonReq,
  match,
  pollDetail,
  repo,
  timeOption,
  turfOption,
} from "./match-polls-fixtures.js";

describe("handleFinalizeMatch", () => {
  it("sets scheduledAt/venue from the winning options and moves the match to draft", async () => {
    const startsAt = new Date("2026-08-01T19:00:00.000Z");
    const updates: UpdateMatchInput[] = [];
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "finalizing" }) };
      },
      async getMatchPoll() {
        return {
          ok: true,
          value: pollDetail(
            { closedAt: new Date() },
            [timeOption({ startsAt }), turfOption({ label: "Riverside Turf", detail: "12 Riverside Rd" })],
          ),
        };
      },
      async updateMatch(_o: string, _m: string, input: UpdateMatchInput) {
        updates.push(input);
        return {
          ok: true,
          value: { ...match({ status: "finalizing" }), status: "draft", scheduledAt: input.scheduledAt!, venue: input.venue!, updatedAt: input.updatedAt },
        };
      },
    });
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      allowEnv() as never,
      "r1",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { match: { status: string; scheduledAt: string; venue: { name: string; address: string | null } } } };
    expect(json.data.match.status).toBe("draft");
    expect(json.data.match.scheduledAt).toBe(startsAt.toISOString());
    expect(json.data.match.venue.name).toBe("Riverside Turf");
    expect(json.data.match.venue.address).toBe("12 Riverside Rd");
    expect(updates).toHaveLength(1);
    expect(updates[0]!.status).toBe("draft");
  });

  it("also finalizes when status is still 'poll' but the poll's closed_at is set (auto-close race)", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "poll" }) };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({ closedAt: new Date() }) };
      },
    });
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      allowEnv() as never,
      "r2",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(200);
  });

  it("409s when the poll is still open (status 'poll', closed_at null)", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "poll" }) };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({ closedAt: null }) };
      },
    });
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      allowEnv() as never,
      "r3",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(409);
  });

  it("409s for a match already past finalizing (e.g. 'draft')", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "draft" }) };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({ closedAt: new Date() }) };
      },
    });
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      allowEnv() as never,
      "r4",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(409);
  });

  it("422s when timeOptionId belongs to this poll but is the wrong kind (a turf option)", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "finalizing" }) };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({ closedAt: new Date() }) };
      },
    });
    const res = await handleFinalizeMatch(
      // TURF_OPT is a 'turf' kind option — invalid as the timeOptionId.
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TURF_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      allowEnv() as never,
      "r5",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { details: { fields: Record<string, string[]> } } };
    expect(json.error.details.fields.timeOptionId).toBeDefined();
  });

  it("422s when turfOptionId does not belong to this match's poll at all", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: true, value: match({ status: "finalizing" }) };
      },
      async getMatchPoll() {
        return { ok: true, value: pollDetail({ closedAt: new Date() }) };
      },
    });
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(FOREIGN_OPT) }),
      allowEnv() as never,
      "r6",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: { details: { fields: Record<string, string[]> } } };
    expect(json.error.details.fields.turfOptionId).toBeDefined();
  });

  it("422s on a missing/malformed body before ever checking policy or the repo", async () => {
    const res = await handleFinalizeMatch(jsonReq("POST", { timeOptionId: 5 }), denyEnv() as never, "r7", ACTOR, ORG, MATCH, {
      repo: repo(),
    });
    expect(res.status).toBe(422);
  });

  it("404s when the match does not exist", async () => {
    const r = repo({
      async getMatchById() {
        return { ok: false, error: { kind: "not_found" } };
      },
    });
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      allowEnv() as never,
      "r8",
      ACTOR,
      ORG,
      MATCH,
      { repo: r },
    );
    expect(res.status).toBe(404);
  });

  it("404s (opaque) when policy denies organization.poll.manage", async () => {
    const res = await handleFinalizeMatch(
      jsonReq("POST", { timeOptionId: pollOptionPublicId(TIME_OPT), turfOptionId: pollOptionPublicId(TURF_OPT) }),
      denyEnv() as never,
      "r9",
      ACTOR,
      ORG,
      MATCH,
      { repo: repo() },
    );
    expect(res.status).toBe(404);
  });
});
