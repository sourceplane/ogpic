import type { MatchVenue } from "@saas/db/matchmaker";

const NAME_MAX = 80;
const ADDR_MAX = 200;

/**
 * Parse an optional match-venue input. Returns null when the venue is absent
 * (create → use the empty default; update → leave unchanged). Invalid shapes
 * push to `fields`; the returned object is still best-effort so a single call
 * both validates and coerces.
 */
export function parseVenueInput(raw: unknown, fields: Record<string, string[]>): MatchVenue | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    fields.venue = ["Must be an object with name, address, booked"];
    return null;
  }
  const v = raw as Record<string, unknown>;
  if (v.name !== undefined && v.name !== null && (typeof v.name !== "string" || v.name.length > NAME_MAX)) {
    fields["venue.name"] = [`Must be a string of at most ${NAME_MAX} characters`];
  }
  if (v.address !== undefined && v.address !== null && (typeof v.address !== "string" || v.address.length > ADDR_MAX)) {
    fields["venue.address"] = [`Must be a string of at most ${ADDR_MAX} characters`];
  }
  if (v.booked !== undefined && typeof v.booked !== "boolean") {
    fields["venue.booked"] = ["Must be a boolean"];
  }
  return {
    name: typeof v.name === "string" && v.name.trim().length > 0 ? v.name.trim() : null,
    address: typeof v.address === "string" && v.address.trim().length > 0 ? v.address.trim() : null,
    booked: v.booked === true,
  };
}

export const EMPTY_VENUE: MatchVenue = { name: null, address: null, booked: false };
