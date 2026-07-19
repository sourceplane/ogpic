// Tests for the live-data adapter (`live.ts`) — mapping real matchmaker API
// shapes into the Rondo view-model's seed shapes (rondo-v5-spec.md §3/§4/§7).

import { describe, expect, it } from "vitest";

import type { PublicAvailability, PublicMatch, PublicPlayer } from "@saas/contracts/matchmaker";
import type { MatchPollResponse, PublicChatMessage, PublicJoinRequest, PublicMatchDropout } from "@saas/sdk";
import {
  availabilityAtMap,
  availabilityMap,
  buildDropoutSeed,
  buildLiveSeed,
  chatSeedRows,
  computePlayerStats,
  joinRequestRows,
  mapPlayer,
  matchPhaseOf,
  matchRows,
  nextActionableMatch,
  pollsSeedMap,
} from "./live";

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function venue(overrides: Partial<PublicMatch["venue"]> = {}): PublicMatch["venue"] {
  return { name: null, address: null, booked: false, mapsUrl: null, ...overrides };
}

function team(overrides: Partial<PublicMatch["teamA"]> = {}): PublicMatch["teamA"] {
  return { name: "", players: [], squadRating: 0, ...overrides };
}

function match(overrides: Partial<PublicMatch> = {}): PublicMatch {
  return {
    id: "m1",
    orgId: "org1",
    scheduledAt: "2026-08-01T18:00:00.000Z",
    status: "scheduled",
    format: null,
    teamA: team(),
    teamB: team(),
    ratingA: 0,
    ratingB: 0,
    scoreA: null,
    scoreB: null,
    venue: venue(),
    shareToken: "tok",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function publicPlayer(overrides: Partial<PublicPlayer> = {}): PublicPlayer {
  return {
    id: "p1",
    orgId: "org1",
    name: "Marco Silva",
    position: "FWD",
    rating: 90,
    baseRating: 90,
    voteCount: 0,
    attributes: { PAC: 90, SHO: 88, PAS: 80, DRI: 85, DEF: 40, PHY: 70 },
    email: null,
    phone: null,
    status: "active",
    isCaptain: false,
    claimed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    ...overrides,
  };
}

function draftedPlayer(id: string, name = id, rating = 80): PublicMatch["teamA"]["players"][number] {
  return { id, name, position: "MID", rating };
}

// ---------------------------------------------------------------------------
// matchPhaseOf
// ---------------------------------------------------------------------------

describe("matchPhaseOf", () => {
  it("maps every known MatchStatus 1:1", () => {
    const statuses = ["poll", "finalizing", "draft", "scheduled", "live", "played", "cancelled"] as const;
    for (const s of statuses) expect(matchPhaseOf(s)).toBe(s);
  });

  it("falls back to 'scheduled' for an unrecognized status", () => {
    expect(matchPhaseOf("some_future_status")).toBe("scheduled");
    expect(matchPhaseOf("")).toBe("scheduled");
  });
});

// ---------------------------------------------------------------------------
// matchRows
// ---------------------------------------------------------------------------

describe("matchRows", () => {
  it("marks a played match with a valid score as played, with the correct color", () => {
    const rows = matchRows([match({ status: "played", scoreA: 3, scoreB: 1 })]);
    expect(rows[0]!.score).toBe("3 – 1");
    expect(rows[0]!.color).toBe("#56C98D"); // home win
    expect(rows[0]!.phase).toBe("played");
  });

  it("shows a draw in the neutral color", () => {
    const rows = matchRows([match({ status: "played", scoreA: 2, scoreB: 2 })]);
    expect(rows[0]!.color).toBe("#C9CBCE");
  });

  it("shows an away win in the loss color from the home perspective", () => {
    const rows = matchRows([match({ status: "played", scoreA: 0, scoreB: 2 })]);
    expect(rows[0]!.color).toBe("#FF7A6B");
  });

  it("shows LIVE / CXL score placeholders for live/cancelled matches", () => {
    const rows = matchRows([match({ status: "live" }), match({ id: "m2", status: "cancelled" })]);
    expect(rows[0]!.score).toBe("LIVE");
    expect(rows[0]!.color).toBe("#8A8D93");
    expect(rows[1]!.score).toBe("CXL");
  });

  it("shows a dash for pre-schedule phases (poll/finalizing/draft) even with scores absent", () => {
    for (const status of ["poll", "finalizing", "draft"] as const) {
      const rows = matchRows([match({ status })]);
      expect(rows[0]!.score).toBe("—");
      expect(rows[0]!.phase).toBe(status);
    }
  });

  it("does NOT mark 'played' with null scores as played (falls through to the dash)", () => {
    const rows = matchRows([match({ status: "played", scoreA: null, scoreB: null })]);
    expect(rows[0]!.score).toBe("—");
    expect(rows[0]!.color).toBe("#8A8D93");
  });

  it("populates progressStep from MATCH_PHASE_PROGRESS per phase", () => {
    const rows = matchRows([
      match({ id: "a", status: "poll" }),
      match({ id: "b", status: "finalizing" }),
      match({ id: "c", status: "draft" }),
      match({ id: "d", status: "scheduled" }),
    ]);
    expect(rows.map((r) => r.progressStep)).toEqual([33, 55, 75, 100]);
  });

  it("labels with date+time when scheduledAt parses, and falls back to the venue for subLabel", () => {
    const rows = matchRows([match({ scheduledAt: "2026-08-01T18:30:00.000Z", venue: venue({ name: "Riverside Turf" }) })]);
    expect(rows[0]!.label).toBe("01 AUG · 18:30");
    expect(rows[0]!.subLabel).toBe("Riverside Turf");
  });

  it("falls back to the phase label for both label and subLabel when scheduledAt is unparseable and there's no venue", () => {
    const rows = matchRows([match({ scheduledAt: "not-a-date", status: "poll", venue: venue({ name: null }) })]);
    expect(rows[0]!.label).toBe("POLL LIVE");
    expect(rows[0]!.subLabel).toBe("POLL LIVE");
  });

  it("caps output at 8 rows", () => {
    const many = Array.from({ length: 12 }, (_, i) => match({ id: `m${i}` }));
    expect(matchRows(many)).toHaveLength(8);
  });

  it("maps team rosters and rounds ratings", () => {
    const rows = matchRows([
      match({
        teamA: team({ name: "Home", players: [draftedPlayer("p1", "Marco")], squadRating: 0 }),
        ratingA: 84.6,
        teamB: team({ name: "", players: [] }),
        ratingB: 70,
      }),
    ]);
    expect(rows[0]!.teamA!.name).toBe("Home");
    expect(rows[0]!.teamA!.players).toEqual(["Marco"]);
    expect(rows[0]!.teamA!.rating).toBe(85);
    expect(rows[0]!.teamB!.name).toBe("Away"); // empty name falls back
  });
});

// ---------------------------------------------------------------------------
// nextActionableMatch
// ---------------------------------------------------------------------------

describe("nextActionableMatch", () => {
  it("returns null when there are no scheduled/live matches", () => {
    expect(nextActionableMatch([])).toBeNull();
    expect(nextActionableMatch([match({ status: "poll" }), match({ id: "m2", status: "draft" })])).toBeNull();
  });

  it("prefers a live match over any scheduled one", () => {
    const result = nextActionableMatch([
      match({ id: "sched1", status: "scheduled", scheduledAt: "2026-08-01T00:00:00.000Z" }),
      match({ id: "live1", status: "live" }),
    ]);
    expect(result?.id).toBe("live1");
  });

  it("picks the soonest scheduled match when there's no live match", () => {
    const result = nextActionableMatch([
      match({ id: "later", status: "scheduled", scheduledAt: "2026-09-01T00:00:00.000Z" }),
      match({ id: "sooner", status: "scheduled", scheduledAt: "2026-08-01T00:00:00.000Z" }),
    ]);
    expect(result?.id).toBe("sooner");
  });

  it("skips poll/finalizing/draft matches even if they'd otherwise sort first", () => {
    const result = nextActionableMatch([
      match({ id: "poll1", status: "poll", scheduledAt: "2026-07-01T00:00:00.000Z" }),
      match({ id: "sched1", status: "scheduled", scheduledAt: "2026-08-01T00:00:00.000Z" }),
    ]);
    expect(result?.id).toBe("sched1");
  });

  it("does not treat a cancelled or played match as actionable", () => {
    const result = nextActionableMatch([match({ status: "cancelled" }), match({ id: "m2", status: "played" })]);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computePlayerStats
// ---------------------------------------------------------------------------

describe("computePlayerStats", () => {
  it("only counts played matches with non-null scores", () => {
    const stats = computePlayerStats([
      match({ status: "scheduled", teamA: team({ players: [draftedPlayer("p1")] }) }),
      match({ id: "m2", status: "played", scoreA: null, scoreB: null, teamA: team({ players: [draftedPlayer("p1")] }) }),
    ]);
    expect(stats.p1).toBeUndefined();
  });

  it("bumps apps + wins/draws/losses correctly for both teams", () => {
    const stats = computePlayerStats([
      match({
        status: "played",
        scoreA: 2,
        scoreB: 1,
        teamA: team({ players: [draftedPlayer("winner")] }),
        teamB: team({ players: [draftedPlayer("loser")] }),
      }),
    ]);
    expect(stats.winner).toEqual({ apps: 1, wins: 1, draws: 0, losses: 0, goals: 0, motm: 0 });
    expect(stats.loser).toEqual({ apps: 1, wins: 0, draws: 0, losses: 1, goals: 0, motm: 0 });
  });

  it("counts a draw for both teams", () => {
    const stats = computePlayerStats([
      match({
        status: "played",
        scoreA: 1,
        scoreB: 1,
        teamA: team({ players: [draftedPlayer("a")] }),
        teamB: team({ players: [draftedPlayer("b")] }),
      }),
    ]);
    expect(stats.a!.draws).toBe(1);
    expect(stats.b!.draws).toBe(1);
  });

  it("accumulates across multiple matches", () => {
    const stats = computePlayerStats([
      match({ id: "m1", status: "played", scoreA: 1, scoreB: 0, teamA: team({ players: [draftedPlayer("p1")] }) }),
      match({ id: "m2", status: "played", scoreA: 0, scoreB: 1, teamB: team({ players: [draftedPlayer("p1")] }) }),
    ]);
    expect(stats.p1!.apps).toBe(2);
    expect(stats.p1!.wins).toBe(2);
  });

  it("always reports goals and motm as zero (not tracked server-side, spec §8)", () => {
    const stats = computePlayerStats([
      match({ status: "played", scoreA: 5, scoreB: 0, teamA: team({ players: [draftedPlayer("p1")] }) }),
    ]);
    expect(stats.p1!.goals).toBe(0);
    expect(stats.p1!.motm).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// pollsSeedMap
// ---------------------------------------------------------------------------

function pollResponse(overrides: Partial<MatchPollResponse> = {}): MatchPollResponse {
  return {
    poll: { deadlineKind: "24h", deadlineAt: "2026-08-01T00:00:00.000Z", closedAt: null },
    options: [
      { id: "t1", kind: "time", label: "Sat 6pm", detail: null, startsAt: "2026-08-01T18:00:00.000Z", votes: 2, voterPlayerIds: ["p1", "p2"] },
      { id: "f1", kind: "turf", label: "Riverside", detail: "5-a-side", startsAt: null, votes: 1, voterPlayerIds: ["p1"] },
    ],
    voters: ["p1", "p2"],
    eligible: 10,
    ...overrides,
  };
}

describe("pollsSeedMap", () => {
  it("maps each MatchPollResponse to the seed's near-raw poll shape, keyed by match id", () => {
    const result = pollsSeedMap({ m1: pollResponse() });
    expect(result.m1).toEqual({
      deadlineKind: "24h",
      deadlineAt: "2026-08-01T00:00:00.000Z",
      closedAt: null,
      options: [
        { id: "t1", kind: "time", label: "Sat 6pm", detail: null, startsAt: "2026-08-01T18:00:00.000Z", votes: 2, voterPlayerIds: ["p1", "p2"] },
        { id: "f1", kind: "turf", label: "Riverside", detail: "5-a-side", startsAt: null, votes: 1, voterPlayerIds: ["p1"] },
      ],
      voters: ["p1", "p2"],
      eligible: 10,
    });
  });

  it("preserves option `kind` untouched (time/turf split happens downstream in use-rondo.ts)", () => {
    const result = pollsSeedMap({ m1: pollResponse() });
    expect(result.m1!.options.map((o) => o.kind)).toEqual(["time", "turf"]);
  });

  it("handles multiple matches independently", () => {
    const result = pollsSeedMap({
      m1: pollResponse(),
      m2: pollResponse({ eligible: 5, voters: [] }),
    });
    expect(Object.keys(result).sort()).toEqual(["m1", "m2"]);
    expect(result.m2!.eligible).toBe(5);
    expect(result.m2!.voters).toEqual([]);
  });

  it("returns an empty object for an empty input", () => {
    expect(pollsSeedMap({})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// chatSeedRows
// ---------------------------------------------------------------------------

function chatMessage(overrides: Partial<PublicChatMessage> = {}): PublicChatMessage {
  return {
    id: "c1",
    kind: "text",
    body: "hello",
    matchId: null,
    authorPlayerId: "p1",
    authorSubjectId: null,
    authorName: "Marco",
    reactions: {},
    createdAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("chatSeedRows", () => {
  it("maps every field 1:1", () => {
    const rows = chatSeedRows([chatMessage()]);
    expect(rows[0]).toEqual({
      id: "c1",
      kind: "text",
      body: "hello",
      matchId: null,
      authorPlayerId: "p1",
      authorSubjectId: null,
      authorName: "Marco",
      reactions: {},
      createdAt: "2026-08-01T10:00:00.000Z",
    });
  });

  it("preserves input order (sorting is useRondo's job, not this function's)", () => {
    const rows = chatSeedRows([
      chatMessage({ id: "newest", createdAt: "2026-08-02T00:00:00.000Z" }),
      chatMessage({ id: "oldest", createdAt: "2026-08-01T00:00:00.000Z" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["newest", "oldest"]);
  });

  it("discriminates all four message kinds", () => {
    const kinds = ["text", "note", "poll", "sched"] as const;
    const rows = chatSeedRows(kinds.map((kind, i) => chatMessage({ id: `c${i}`, kind })));
    expect(rows.map((r) => r.kind)).toEqual(kinds);
  });

  it("passes reactions through untouched", () => {
    const reactions = { "\u{1F44D}": ["p1", "p2"] };
    const rows = chatSeedRows([chatMessage({ reactions })]);
    expect(rows[0]!.reactions).toBe(reactions);
  });

  it("returns an empty array for no messages", () => {
    expect(chatSeedRows([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildDropoutSeed
// ---------------------------------------------------------------------------

function dropout(overrides: Partial<PublicMatchDropout> = {}): PublicMatchDropout {
  return {
    matchId: "m1",
    playerId: "p1",
    reason: "Injured",
    resolvedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildDropoutSeed", () => {
  it("excludes resolved drop-outs entirely", () => {
    const result = buildDropoutSeed({
      matches: [],
      dropouts: [dropout({ resolvedAt: "2026-08-02T00:00:00.000Z" })],
      players: [publicPlayer({ id: "p1" })],
    });
    expect(result.m1).toBeUndefined();
  });

  it("groups open drop-outs by match id", () => {
    const result = buildDropoutSeed({
      matches: [],
      dropouts: [dropout({ matchId: "m1", playerId: "p1" }), dropout({ matchId: "m2", playerId: "p2" })],
      players: [publicPlayer({ id: "p1", name: "P1" }), publicPlayer({ id: "p2", name: "P2" })],
    });
    expect(Object.keys(result).sort()).toEqual(["m1", "m2"]);
    expect(result.m1!.open).toHaveLength(1);
    expect(result.m2!.open).toHaveLength(1);
  });

  it("resolves player names for open drop-out rows", () => {
    const result = buildDropoutSeed({
      matches: [],
      dropouts: [dropout({ playerId: "p1", reason: "Sick" })],
      players: [publicPlayer({ id: "p1", name: "Marco Silva" })],
    });
    expect(result.m1!.open[0]).toMatchObject({ playerId: "p1", playerName: "Marco Silva", reason: "Sick" });
  });

  it("falls back to 'Player' when the roster doesn't have the dropped player's name", () => {
    const result = buildDropoutSeed({
      matches: [],
      dropouts: [dropout({ playerId: "ghost" })],
      players: [],
    });
    expect(result.m1!.open[0]!.playerName).toBe("Player");
  });

  it("sets `mine` when myPlayerId matches an open drop-out in that match", () => {
    const result = buildDropoutSeed({
      matches: [],
      dropouts: [dropout({ playerId: "me", reason: "Work" })],
      players: [publicPlayer({ id: "me" })],
      myPlayerId: "me",
    });
    expect(result.m1!.mine).toEqual({ reason: "Work" });
  });

  it("leaves `mine` null when myPlayerId doesn't match any open drop-out", () => {
    const result = buildDropoutSeed({
      matches: [],
      dropouts: [dropout({ playerId: "other" })],
      players: [publicPlayer({ id: "other" })],
      myPlayerId: "me",
    });
    expect(result.m1!.mine).toBeNull();
  });

  it("suggests the highest-OVR available player not on either team", () => {
    const m = match({
      id: "m1",
      teamA: team({ players: [draftedPlayer("dropped")] }),
      teamB: team({ players: [draftedPlayer("teammate")] }),
    });
    const result = buildDropoutSeed({
      matches: [m],
      dropouts: [dropout({ matchId: "m1", playerId: "dropped" })],
      players: [
        publicPlayer({ id: "dropped", name: "Dropped", rating: 99 }),
        publicPlayer({ id: "teammate", name: "Teammate", rating: 95 }),
        publicPlayer({ id: "bench", name: "Bench", rating: 80 }),
      ],
    });
    // "dropped" and "teammate" are on the match's rosters, so the suggestion
    // must be "bench" even though "dropped"/"teammate" outrate them.
    expect(result.m1!.open[0]!.suggestedReplacement).toEqual({ id: "bench", name: "Bench", ovr: 80 });
  });

  it("omits suggestedReplacement when no eligible replacement exists", () => {
    const m = match({ id: "m1", teamA: team({ players: [draftedPlayer("dropped")] }) });
    const result = buildDropoutSeed({
      matches: [m],
      dropouts: [dropout({ matchId: "m1", playerId: "dropped" })],
      players: [publicPlayer({ id: "dropped" })],
    });
    expect(result.m1!.open[0]!.suggestedReplacement).toBeUndefined();
  });

  it("filters the suggestion pool to 'in' players when availability is supplied", () => {
    const m = match({ id: "m1", teamA: team({ players: [draftedPlayer("dropped")] }) });
    const result = buildDropoutSeed({
      matches: [m],
      dropouts: [dropout({ matchId: "m1", playerId: "dropped" })],
      players: [
        publicPlayer({ id: "dropped", rating: 99 }),
        publicPlayer({ id: "top-but-out", name: "TopButOut", rating: 98 }),
        publicPlayer({ id: "available", name: "Available", rating: 60 }),
      ],
      availability: { "top-but-out": "out", available: "in" },
    });
    expect(result.m1!.open[0]!.suggestedReplacement).toEqual({ id: "available", name: "Available", ovr: 60 });
  });

  it("never suggests the dropped player as their own replacement, even when the dropout's match isn't in `matches`", () => {
    // Dropped players are added to the exclusion set directly, so a caller
    // omitting the corresponding match (empty inTeam) can't produce a
    // self-replacement suggestion.
    const result = buildDropoutSeed({
      matches: [], // the match for "m1" is NOT supplied
      dropouts: [dropout({ matchId: "m1", playerId: "dropped" })],
      players: [publicPlayer({ id: "dropped", name: "Dropped", rating: 99 })],
    });
    expect(result.m1!.open[0]!.suggestedReplacement).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildLiveSeed
// ---------------------------------------------------------------------------

describe("buildLiveSeed", () => {
  it("always sets the base fields (players/teams/teamName/startScreen)", () => {
    const seed = buildLiveSeed({ orgName: "Northside FC", players: [publicPlayer()], isManager: true });
    expect(seed.teamName).toBe("Northside FC");
    expect(seed.startScreen).toBe("squad");
    expect(seed.teams).toHaveLength(1);
    expect(seed.teams![0]!.role).toBe("Manager");
    expect(seed.players).toHaveLength(1);
  });

  it("omits every optional key entirely when its input is omitted (no fabricated defaults)", () => {
    const seed = buildLiveSeed({ orgName: "Org", players: [], isManager: false });
    for (const key of [
      "availability",
      "availabilityAt",
      "matches",
      "nextMatch",
      "playerStats",
      "myPlayerId",
      "mySubjectId",
      "payments",
      "joinCode",
      "joinRequests",
      "votingOpen",
      "chat",
      "polls",
      "dropouts",
      "orgSettings",
      "live",
    ] as const) {
      expect(key in seed).toBe(false);
    }
  });

  it("threads chat through chatSeedRows", () => {
    const seed = buildLiveSeed({ orgName: "Org", players: [], isManager: false, chat: [chatMessage({ id: "c1" })] });
    expect(seed.chat).toEqual(chatSeedRows([chatMessage({ id: "c1" })]));
  });

  it("threads polls through pollsSeedMap", () => {
    const seed = buildLiveSeed({ orgName: "Org", players: [], isManager: false, polls: { m1: pollResponse() } });
    expect(seed.polls).toEqual(pollsSeedMap({ m1: pollResponse() }));
  });

  it("threads dropouts through buildDropoutSeed, using dropoutMatches for team composition", () => {
    const m = match({ id: "m1", teamA: team({ players: [draftedPlayer("dropped")] }) });
    const seed = buildLiveSeed({
      orgName: "Org",
      players: [publicPlayer({ id: "dropped" })],
      isManager: false,
      dropouts: [dropout({ matchId: "m1", playerId: "dropped" })],
      dropoutMatches: [m],
      myPlayerId: "dropped",
    });
    expect(seed.dropouts!.m1!.mine).toEqual({ reason: "Injured" });
  });

  it("threads orgSettings and mySubjectId straight through", () => {
    const seed = buildLiveSeed({
      orgName: "Org",
      players: [],
      isManager: false,
      orgSettings: { whatsappBridge: true },
      mySubjectId: "usr_abc123",
    });
    expect(seed.orgSettings).toEqual({ whatsappBridge: true });
    expect(seed.mySubjectId).toBe("usr_abc123");
  });

  it("derives the org crest from the first letter of orgName, uppercased", () => {
    const seed = buildLiveSeed({ orgName: "northside fc", players: [], isManager: true });
    expect(seed.teams![0]!.crest).toBe("N");
  });
});

// ---------------------------------------------------------------------------
// Small helpers: joinRequestRows / availabilityMap / availabilityAtMap / mapPlayer
// ---------------------------------------------------------------------------

function joinRequest(overrides: Partial<PublicJoinRequest> = {}): PublicJoinRequest {
  return {
    id: "jr1",
    subjectId: "usr_abcdef1234",
    status: "pending",
    requestedRole: "viewer",
    createdAt: "2026-08-01T00:00:00.000Z",
    decidedAt: null,
    ...overrides,
  };
}

describe("joinRequestRows", () => {
  it("only includes pending requests", () => {
    const rows = joinRequestRows([joinRequest({ status: "pending" }), joinRequest({ id: "jr2", status: "approved" })]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("jr1");
  });

  it("derives a display name from the subject id", () => {
    const rows = joinRequestRows([joinRequest({ subjectId: "usr_abcdef1234" })]);
    expect(rows[0]!.name).toBe("Player abcdef");
  });
});

describe("availabilityMap / availabilityAtMap", () => {
  const rows: PublicAvailability[] = [
    { playerId: "p1", state: "in", updatedAt: "2026-08-01T00:00:00.000Z" },
    { playerId: "p2", state: "out", updatedAt: "2026-08-02T00:00:00.000Z" },
  ];

  it("maps playerId to state", () => {
    expect(availabilityMap(rows)).toEqual({ p1: "in", p2: "out" });
  });

  it("maps playerId to updatedAt", () => {
    expect(availabilityAtMap(rows)).toEqual({ p1: "2026-08-01T00:00:00.000Z", p2: "2026-08-02T00:00:00.000Z" });
  });
});

describe("mapPlayer", () => {
  it("maps a PublicPlayer into the VM's Player shape", () => {
    const p = mapPlayer(publicPlayer({ id: "p1", name: "Marco", position: "FWD", rating: 91, isCaptain: true, email: "m@x.test" }));
    expect(p).toEqual({
      id: "p1",
      name: "Marco",
      pos: "FWD",
      ovr: 91,
      skills: { PAC: 90, SHO: 88, PAS: 80, DRI: 85, DEF: 40, PHY: 70 },
      myStars: {},
      isCaptain: true,
      email: "m@x.test",
    });
  });

  it("defaults a null email to null (not undefined)", () => {
    const p = mapPlayer(publicPlayer({ email: null }));
    expect(p.email).toBeNull();
  });
});
