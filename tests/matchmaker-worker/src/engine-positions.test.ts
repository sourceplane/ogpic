import {
  isPlayerPosition,
  expectedKeysForPosition,
  validateAttributes,
  suggestPosition,
} from "@matchmaker-worker/engine/positions";

describe("isPlayerPosition", () => {
  it("accepts the five valid positions and rejects others", () => {
    for (const p of ["GK", "DEF", "MID", "FWD", "ALL"]) expect(isPlayerPosition(p)).toBe(true);
    expect(isPlayerPosition("STRIKER")).toBe(false);
    expect(isPlayerPosition(5)).toBe(false);
  });
});

describe("expectedKeysForPosition", () => {
  it("returns the GK set for goalkeepers and the outfield set otherwise", () => {
    expect(expectedKeysForPosition("GK")).toEqual(["DIV", "HAN", "KIC", "REF", "SPD", "POS"]);
    expect(expectedKeysForPosition("MID")).toEqual(["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"]);
  });
});

describe("validateAttributes", () => {
  it("accepts a well-formed outfield set", () => {
    const res = validateAttributes("FWD", { PAC: 90, SHO: 92, PAS: 80, DRI: 91, DEF: 40, PHY: 78 });
    expect(res.valid).toBe(true);
  });

  it("rejects a GK key set on an outfield player", () => {
    const res = validateAttributes("MID", { DIV: 80, HAN: 80, KIC: 80, REF: 80, SPD: 80, POS: 80 });
    expect(res.valid).toBe(false);
  });

  it("rejects out-of-range and non-integer values", () => {
    expect(validateAttributes("MID", { PAC: 100, SHO: 80, PAS: 80, DRI: 80, DEF: 80, PHY: 80 }).valid).toBe(false);
    expect(validateAttributes("MID", { PAC: 0, SHO: 80, PAS: 80, DRI: 80, DEF: 80, PHY: 80 }).valid).toBe(false);
    expect(validateAttributes("MID", { PAC: 80.5, SHO: 80, PAS: 80, DRI: 80, DEF: 80, PHY: 80 }).valid).toBe(false);
  });

  it("rejects unexpected keys", () => {
    const res = validateAttributes("MID", { PAC: 80, SHO: 80, PAS: 80, DRI: 80, DEF: 80, PHY: 80, XTR: 80 });
    expect(res.valid).toBe(false);
  });
});

describe("suggestPosition", () => {
  it("suggests DEF for a defensive profile", () => {
    expect(suggestPosition({ PAC: 70, SHO: 40, PAS: 60, DRI: 60, DEF: 88, PHY: 82 })).toBe("DEF");
  });
  it("suggests FWD for a shooting profile", () => {
    expect(suggestPosition({ PAC: 85, SHO: 90, PAS: 70, DRI: 80, DEF: 40, PHY: 78 })).toBe("FWD");
  });
  it("suggests MID for a passing/dribbling profile", () => {
    expect(suggestPosition({ PAC: 74, SHO: 70, PAS: 85, DRI: 82, DEF: 63, PHY: 77 })).toBe("MID");
  });
  it("falls back to ALL for a balanced profile", () => {
    expect(suggestPosition({ PAC: 70, SHO: 70, PAS: 70, DRI: 70, DEF: 70, PHY: 70 })).toBe("ALL");
  });
});
