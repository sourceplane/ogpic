import { describe, it, expect } from "vitest";
import {
  wizardInit,
  wizardAddTime,
  wizardRemoveTime,
  wizardAddTurf,
  wizardRemoveTurf,
  wizardSetDeadline,
  wizardNext,
  wizardBack,
  wizardGoToStep,
  wizardValidation,
  wizardPayload,
  type WizardState,
} from "./wizard";

describe("wizard pure core", () => {
  it("initializes at step 1 with empty drafts and a 24h deadline", () => {
    expect(wizardInit()).toEqual({ step: 1, times: [], turfs: [], deadline: "24h", seq: 0 });
  });

  it("adds times with trimmed labels, unique ids, and optional startsAt only when set", () => {
    let s = wizardInit();
    s = wizardAddTime(s, { label: "  Sat 18:30  ", startsAt: "2026-08-01T18:30:00Z" });
    s = wizardAddTime(s, { label: "Sun 10:00" });
    expect(s.times).toHaveLength(2);
    expect(s.times[0]).toEqual({ id: "t1", label: "Sat 18:30", startsAt: "2026-08-01T18:30:00Z" });
    expect(s.times[1]).toEqual({ id: "t2", label: "Sun 10:00" });
    expect("startsAt" in s.times[1]!).toBe(false);
  });

  it("ignores blank labels for times and turfs", () => {
    let s = wizardInit();
    s = wizardAddTime(s, { label: "   " });
    s = wizardAddTurf(s, { label: "" });
    expect(s).toEqual(wizardInit());
  });

  it("removes exactly the named draft", () => {
    let s = wizardInit();
    s = wizardAddTime(s, { label: "A" });
    s = wizardAddTime(s, { label: "B" });
    s = wizardRemoveTime(s, "t1");
    expect(s.times.map((t) => t.label)).toEqual(["B"]);
    s = wizardAddTurf(s, { label: "Cage" });
    s = wizardRemoveTurf(s, "f3");
    expect(s.turfs).toEqual([]);
  });

  it("keeps draft ids unique across mixed time/turf adds and removals", () => {
    let s = wizardInit();
    s = wizardAddTime(s, { label: "A" }); // t1
    s = wizardAddTurf(s, { label: "X" }); // f2
    s = wizardRemoveTime(s, "t1");
    s = wizardAddTime(s, { label: "B" }); // t3, not t1 again
    expect(s.times[0]!.id).toBe("t3");
  });

  it("clamps step navigation to 1..3", () => {
    let s = wizardInit();
    s = wizardBack(s);
    expect(s.step).toBe(1);
    s = wizardNext(wizardNext(wizardNext(s)));
    expect(s.step).toBe(3);
    expect(wizardGoToStep(s, 99).step).toBe(3);
    expect(wizardGoToStep(s, -4).step).toBe(1);
  });

  it("validation requires at least one time AND one turf", () => {
    let s = wizardInit();
    expect(wizardValidation(s)).toEqual({ hasTime: false, hasTurf: false, valid: false });
    s = wizardAddTime(s, { label: "A" });
    expect(wizardValidation(s).valid).toBe(false);
    s = wizardAddTurf(s, { label: "X", detail: "3G" });
    expect(wizardValidation(s)).toEqual({ hasTime: true, hasTurf: true, valid: true });
  });

  it("sets the deadline kind", () => {
    const s = wizardSetDeadline(wizardInit(), "manual");
    expect(s.deadline).toBe("manual");
  });

  it("payload strips ids and carries optionals only when present (SDK poll-block shape)", () => {
    let s = wizardInit();
    s = wizardAddTime(s, { label: "Sat 18:30", startsAt: "2026-08-01T18:30:00Z" });
    s = wizardAddTime(s, { label: "Sun 10:00" });
    s = wizardAddTurf(s, { label: "Riverside", detail: "6-A-SIDE · 3G" });
    s = wizardAddTurf(s, { label: "The Cage" });
    s = wizardSetDeadline(s, "48h");
    const payload = wizardPayload(s);
    expect(payload).toEqual({
      times: [{ label: "Sat 18:30", startsAt: "2026-08-01T18:30:00Z" }, { label: "Sun 10:00" }],
      turfs: [{ label: "Riverside", detail: "6-A-SIDE · 3G" }, { label: "The Cage" }],
      deadline: "48h",
    });
    expect("startsAt" in payload.times[1]!).toBe(false);
    expect("detail" in payload.turfs[1]!).toBe(false);
    expect("id" in payload.times[0]!).toBe(false);
  });

  it("transitions never mutate the input state", () => {
    const s0 = wizardInit();
    const frozen: WizardState = Object.freeze({ ...s0, times: Object.freeze([]) as never, turfs: Object.freeze([]) as never });
    expect(() => wizardAddTime(frozen, { label: "A" })).not.toThrow();
    expect(() => wizardNext(frozen)).not.toThrow();
    expect(frozen.step).toBe(1);
  });
});
