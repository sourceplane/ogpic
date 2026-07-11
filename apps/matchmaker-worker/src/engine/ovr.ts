// Overall-rating (OVR) computation. Pure.

/**
 * Compute a player's OVR as the rounded mean of their attribute values. The six
 * attributes are averaged (matching the seed app), and the result is clamped to
 * the legal [1, 99] band so an all-1s card is never a 0 and an all-99s card is
 * never 100. The caller is expected to pass a validated attribute set.
 */
export function computeOvr(attributes: Record<string, number>): number {
  const values = Object.values(attributes);
  if (values.length === 0) return 1;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = Math.round(sum / values.length);
  return Math.max(1, Math.min(99, avg));
}
