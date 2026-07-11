import { computeOvr } from "@matchmaker-worker/engine/ovr";

describe("computeOvr", () => {
  it("averages the six attributes and rounds", () => {
    expect(computeOvr({ PAC: 91, SHO: 92, PAS: 91, DRI: 95, DEF: 38, PHY: 68 })).toBe(79);
  });

  it("returns the flat value when all attributes are equal", () => {
    expect(computeOvr({ PAC: 80, SHO: 80, PAS: 80, DRI: 80, DEF: 80, PHY: 80 })).toBe(80);
  });

  it("clamps into the [1, 99] band", () => {
    expect(computeOvr({ A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 })).toBe(1);
    expect(computeOvr({ A: 99, B: 99, C: 99, D: 99, E: 99, F: 99 })).toBe(99);
  });

  it("defends against an empty attribute set", () => {
    expect(computeOvr({})).toBe(1);
  });
});
