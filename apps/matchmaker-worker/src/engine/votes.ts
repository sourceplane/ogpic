// Community-vote → overall-rating blending. Pure.
//
// A player's *baseline* OVR is the manager-authored value (computeOvr of the
// stored attributes). Community members rate the player 1-5 stars per skill;
// the mean of those stars maps onto the 1-99 band and is blended with the
// baseline. The baseline is weighted as VOTE_PRIOR pseudo-votes so a single
// rating nudges — rather than overwrites — the manager's assessment, and a
// player with no votes keeps exactly their baseline.

const OVR_MIN = 1;
const OVR_MAX = 99;

/** The manager baseline counts as this many community votes (stickiness). */
export const VOTE_PRIOR = 2;

function clampOvr(n: number): number {
  return Math.max(OVR_MIN, Math.min(OVR_MAX, n));
}

/** Map a mean star rating (1-5) onto the 1-99 overall band. */
export function communityOvr(avgStars: number): number {
  return clampOvr(Math.round((avgStars / 5) * OVR_MAX));
}

/**
 * Blend a baseline OVR with community sentiment. With no voters the baseline is
 * returned unchanged; otherwise the community mean pulls the rating toward
 * itself, resisted by VOTE_PRIOR pseudo-votes at the baseline value.
 */
export function effectiveRating(baseOvr: number, voterCount: number, avgStars: number): number {
  if (voterCount <= 0) return clampOvr(baseOvr);
  const community = communityOvr(avgStars);
  return clampOvr(Math.round((baseOvr * VOTE_PRIOR + community * voterCount) / (VOTE_PRIOR + voterCount)));
}
