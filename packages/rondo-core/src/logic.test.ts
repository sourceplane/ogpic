// Tests for the pure domain helpers in `logic.ts` (design-reference.md §B/§C,
// rondo-v5-spec.md §7). No DOM, no React — these are plain data functions.

import { describe, expect, it } from "vitest";

import {
  AVAIL_META,
  balance,
  initials,
  isConfirmedPhase,
  MATCH_PHASE_LABEL,
  MATCH_PHASE_PROGRESS,
  type MatchPhase,
  posColor,
  shortName,
  skillsFor,
  suggestReplacement,
  tierOf,
  type Player,
} from "./logic";

function player(id: string, ovr: number, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: `Player ${id}`,
    pos: "MID",
    ovr,
    skills: {},
    myStars: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MATCH_PHASE_PROGRESS / MATCH_PHASE_LABEL
// ---------------------------------------------------------------------------

describe("MATCH_PHASE_PROGRESS", () => {
  it("maps the spec's poll/finalizing/draft progress values (§2 screen 4: 33/55/75)", () => {
    expect(MATCH_PHASE_PROGRESS.poll).toBe(33);
    expect(MATCH_PHASE_PROGRESS.finalizing).toBe(55);
    expect(MATCH_PHASE_PROGRESS.draft).toBe(75);
  });

  it("holds post-schedule phases at 100%", () => {
    expect(MATCH_PHASE_PROGRESS.scheduled).toBe(100);
    expect(MATCH_PHASE_PROGRESS.live).toBe(100);
    expect(MATCH_PHASE_PROGRESS.played).toBe(100);
  });

  it("shows an empty bar for a cancelled match", () => {
    expect(MATCH_PHASE_PROGRESS.cancelled).toBe(0);
  });

  it("has an entry for every MatchPhase (no silent fallback to undefined)", () => {
    const phases: MatchPhase[] = ["poll", "finalizing", "draft", "scheduled", "live", "played", "cancelled"];
    for (const phase of phases) {
      expect(typeof MATCH_PHASE_PROGRESS[phase]).toBe("number");
      expect(typeof MATCH_PHASE_LABEL[phase]).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// isConfirmedPhase
// ---------------------------------------------------------------------------

describe("isConfirmedPhase", () => {
  it("is false for the pre-schedule poll pipeline (poll/finalizing/draft)", () => {
    expect(isConfirmedPhase("poll")).toBe(false);
    expect(isConfirmedPhase("finalizing")).toBe(false);
    expect(isConfirmedPhase("draft")).toBe(false);
  });

  it("is true for scheduled/live/played", () => {
    expect(isConfirmedPhase("scheduled")).toBe(true);
    expect(isConfirmedPhase("live")).toBe(true);
    expect(isConfirmedPhase("played")).toBe(true);
  });

  it("is false for cancelled (a cancelled match never counts as a confirmed fixture)", () => {
    expect(isConfirmedPhase("cancelled")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// suggestReplacement
// ---------------------------------------------------------------------------

describe("suggestReplacement", () => {
  it("picks the highest-OVR player not in excludeIds", () => {
    const pool = [player("p1", 70), player("p2", 90), player("p3", 85)];
    const result = suggestReplacement(pool, []);
    expect(result?.id).toBe("p2");
  });

  it("excludes players already on either team (excludeIds is the union of both teams)", () => {
    const pool = [player("p1", 70), player("p2", 90), player("p3", 85)];
    const result = suggestReplacement(pool, ["p2"]);
    expect(result?.id).toBe("p3");
  });

  it("excludes the dropped player themselves when passed in excludeIds", () => {
    const pool = [player("p1", 70), player("p2", 90)];
    // p2 is the highest OVR but is the player who dropped out.
    const result = suggestReplacement(pool, ["p2"]);
    expect(result?.id).toBe("p1");
  });

  it("returns null when every candidate is excluded", () => {
    const pool = [player("p1", 70), player("p2", 90)];
    const result = suggestReplacement(pool, ["p1", "p2"]);
    expect(result).toBeNull();
  });

  it("returns null for an empty pool", () => {
    expect(suggestReplacement([], [])).toBeNull();
  });

  it("breaks OVR ties in favor of the first candidate in pool order", () => {
    const pool = [player("first", 88), player("second", 88)];
    const result = suggestReplacement(pool, []);
    expect(result?.id).toBe("first");
  });

  it("ignores excludeIds that don't match any pool member", () => {
    const pool = [player("p1", 70), player("p2", 90)];
    const result = suggestReplacement(pool, ["not-in-pool"]);
    expect(result?.id).toBe("p2");
  });
});

// ---------------------------------------------------------------------------
// balance (pre-existing helper, sanity-checked here since it's pure & untested)
// ---------------------------------------------------------------------------

describe("balance", () => {
  it("splits only 'in' players, capped at teamSize per side", () => {
    const players = [player("p1", 90), player("p2", 80), player("p3", 70), player("p4", 60), player("p5", 50)];
    const availOf = () => "in" as const;
    const { homeIds, awayIds } = balance(players, availOf, 2);
    expect(homeIds).toHaveLength(2);
    expect(awayIds).toHaveLength(2);
    expect([...homeIds, ...awayIds]).not.toContain("p5");
  });

  it("excludes players who are not 'in'", () => {
    const players = [player("p1", 90), player("p2", 80)];
    const availOf = (id: string): "in" | "out" => (id === "p1" ? "in" : "out");
    const { homeIds, awayIds } = balance(players, availOf, 5);
    expect([...homeIds, ...awayIds]).toEqual(["p1"]);
  });

  it("keeps the two sides' OVR totals close (greedy balancing)", () => {
    const players = [player("p1", 90), player("p2", 89), player("p3", 88), player("p4", 87)];
    const availOf = () => "in" as const;
    const { homeIds, awayIds } = balance(players, availOf, 2);
    const sum = (ids: string[]) => ids.reduce((s, id) => s + players.find((p) => p.id === id)!.ovr, 0);
    expect(Math.abs(sum(homeIds) - sum(awayIds))).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Small display helpers (cheap to cover, easy to silently regress)
// ---------------------------------------------------------------------------

describe("tierOf", () => {
  it("buckets OVR into ELITE/GOLD/SILVER/BRONZE at the documented boundaries", () => {
    expect(tierOf(90).label).toBe("ELITE");
    expect(tierOf(89).label).toBe("GOLD");
    expect(tierOf(84).label).toBe("GOLD");
    expect(tierOf(83).label).toBe("SILVER");
    expect(tierOf(78).label).toBe("SILVER");
    expect(tierOf(77).label).toBe("BRONZE");
    expect(tierOf(0).label).toBe("BRONZE");
  });
});

describe("posColor", () => {
  it("returns a known color for each position and a fallback for unknown", () => {
    expect(posColor("GK")).toBe("#E0C074");
    expect(posColor("DEF")).toBe("#6EA8FF");
    expect(posColor("MID")).toBe("#56C98D");
    expect(posColor("FWD")).toBe("#FF7A6B");
    expect(posColor("ALL")).toBe("#4EC9C4");
    // @ts-expect-error - exercising the runtime fallback for an unmapped value
    expect(posColor("UNKNOWN")).toBe("#9A9DA3");
  });
});

describe("skillsFor", () => {
  it("returns GK skills for GK and outfield skills otherwise", () => {
    expect(skillsFor("GK")).toEqual(["DIV", "HAN", "KIC", "REF", "SPD", "POS"]);
    expect(skillsFor("FWD")).toEqual(["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"]);
  });
});

describe("shortName / initials", () => {
  it("shortName abbreviates the first name when there's a last name", () => {
    expect(shortName("Marco Silva")).toBe("M. Silva");
  });

  it("shortName returns the name unchanged when there's no last name", () => {
    expect(shortName("Marco")).toBe("Marco");
  });

  it("initials takes the first letter of first + last name, uppercased", () => {
    expect(initials("marco silva")).toBe("MS");
  });

  it("initials handles a single-word name", () => {
    expect(initials("Marco")).toBe("M");
  });
});

describe("AVAIL_META", () => {
  it("has a label/color entry for every Availability state", () => {
    expect(AVAIL_META.in.label).toBe("Available");
    expect(AVAIL_META.maybe.label).toBe("Maybe");
    expect(AVAIL_META.out.label).toBe("Out");
  });
});
