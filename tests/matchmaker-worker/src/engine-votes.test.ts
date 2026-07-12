import { communityOvr, effectiveRating, VOTE_PRIOR } from "@matchmaker-worker/engine/votes";

describe("communityOvr", () => {
  it("maps a mean star rating onto the 1-99 band", () => {
    expect(communityOvr(5)).toBe(99);
    expect(communityOvr(3)).toBe(59);
    expect(communityOvr(1)).toBe(20);
  });

  it("never leaves the [1, 99] band", () => {
    expect(communityOvr(0)).toBe(1);
    expect(communityOvr(5.5)).toBe(99);
  });
});

describe("effectiveRating", () => {
  it("returns the baseline unchanged when there are no votes", () => {
    expect(effectiveRating(78, 0, 0)).toBe(78);
    expect(effectiveRating(78, 0, 4)).toBe(78);
  });

  it("blends the baseline with community sentiment weighted by voter count", () => {
    // base 60, community 5★→99, 1 voter, prior 2 → (60*2 + 99*1)/3 = 73
    expect(effectiveRating(60, 1, 5)).toBe(73);
    // more voters pull harder toward the community value
    expect(effectiveRating(60, 10, 5)).toBe(93);
  });

  it("the baseline acts as VOTE_PRIOR pseudo-votes", () => {
    // equal weight when voterCount === VOTE_PRIOR: midpoint of base(40) and community(3★→59)
    const r = effectiveRating(40, VOTE_PRIOR, 3);
    expect(r).toBe(Math.round((40 * VOTE_PRIOR + 59 * VOTE_PRIOR) / (VOTE_PRIOR * 2)));
  });

  it("clamps the blended result", () => {
    expect(effectiveRating(99, 5, 5)).toBe(99);
    expect(effectiveRating(1, 5, 1)).toBeGreaterThanOrEqual(1);
  });
});
