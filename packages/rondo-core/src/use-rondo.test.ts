// Tests for `use-rondo.ts`'s pure exported helper, `buildMatchPollVM`.
//
// `useRondo` itself is a React hook (calls `React.useState`/`React.useEffect`
// directly) and cannot be invoked outside a component render — there is no
// `@testing-library/react`, `react-test-renderer`, or any other React test
// renderer anywhere in this monorepo (checked: no such package appears in
// pnpm-lock.yaml, and no `renderHook`-style helper exists in the codebase).
// Per this package's own "no DOM in this package" invariant (rondo-v5-spec.md
// §7) and the instruction not to add a new React testing dependency for this
// task, `useRondo`'s hook body is intentionally NOT exercised here. Its stateful
// logic is covered indirectly through the pure helpers it delegates to
// (`buildMatchPollVM` here; `logic.ts`/`live.ts` elsewhere).

import { describe, expect, it } from "vitest";

import { buildMatchPollVM, type MatchPollSeed, type PollOptionSeed } from "./use-rondo";

function option(overrides: Partial<PollOptionSeed> = {}): PollOptionSeed {
  return {
    id: "opt1",
    kind: "time",
    label: "Sat 6pm",
    detail: null,
    startsAt: "2026-08-01T18:00:00.000Z",
    votes: 0,
    voterPlayerIds: [],
    ...overrides,
  };
}

function pollSeed(overrides: Partial<MatchPollSeed> = {}): MatchPollSeed {
  return {
    deadlineKind: "24h",
    deadlineAt: "2026-08-01T00:00:00.000Z",
    closedAt: null,
    options: [],
    voters: [],
    eligible: 0,
    ...overrides,
  };
}

describe("buildMatchPollVM", () => {
  it("splits options into times and turfs by kind", () => {
    const seed = pollSeed({
      options: [
        option({ id: "t1", kind: "time" }),
        option({ id: "f1", kind: "turf" }),
        option({ id: "t2", kind: "time" }),
      ],
    });
    const vm = buildMatchPollVM(seed, [], null);
    expect(vm.times.map((o) => o.id)).toEqual(["t1", "t2"]);
    expect(vm.turfs.map((o) => o.id)).toEqual(["f1"]);
  });

  it("marks an option `mine` when myPlayerId is among its voterPlayerIds", () => {
    const seed = pollSeed({ options: [option({ id: "t1", voterPlayerIds: ["p1", "p2"] })] });
    expect(buildMatchPollVM(seed, [], "p1").times[0]!.mine).toBe(true);
    expect(buildMatchPollVM(seed, [], "p3").times[0]!.mine).toBe(false);
  });

  it("`mine` is always false when myPlayerId is null", () => {
    const seed = pollSeed({ options: [option({ voterPlayerIds: ["p1"] })] });
    expect(buildMatchPollVM(seed, [], null).times[0]!.mine).toBe(false);
  });

  it("passes votes and voterPlayerIds through untouched", () => {
    const seed = pollSeed({ options: [option({ votes: 5, voterPlayerIds: ["p1", "p2", "p3"] })] });
    const vm = buildMatchPollVM(seed, [], null);
    expect(vm.times[0]!.votes).toBe(5);
    expect(vm.times[0]!.voterPlayerIds).toEqual(["p1", "p2", "p3"]);
  });

  it("computes waitingPlayerIds as the roster minus the voters", () => {
    const seed = pollSeed({ voters: ["p1", "p3"] });
    const vm = buildMatchPollVM(seed, ["p1", "p2", "p3", "p4"], null);
    expect(vm.waitingPlayerIds).toEqual(["p2", "p4"]);
  });

  it("computes votedCount as voters.length", () => {
    const seed = pollSeed({ voters: ["p1", "p2", "p3"] });
    expect(buildMatchPollVM(seed, [], null).votedCount).toBe(3);
  });

  it("myPlayerVoted is true only when myPlayerId is in voters", () => {
    const seed = pollSeed({ voters: ["p1"] });
    expect(buildMatchPollVM(seed, [], "p1").myPlayerVoted).toBe(true);
    expect(buildMatchPollVM(seed, [], "p2").myPlayerVoted).toBe(false);
    expect(buildMatchPollVM(seed, [], null).myPlayerVoted).toBe(false);
  });

  it("passes deadlineKind/deadlineAt/closedAt/eligible through untouched", () => {
    const seed = pollSeed({ deadlineKind: "manual", deadlineAt: null, closedAt: "2026-08-02T00:00:00.000Z", eligible: 12 });
    const vm = buildMatchPollVM(seed, [], null);
    expect(vm.deadlineKind).toBe("manual");
    expect(vm.deadlineAt).toBeNull();
    expect(vm.closedAt).toBe("2026-08-02T00:00:00.000Z");
    expect(vm.eligible).toBe(12);
  });
});
