import { draftBalancedTeams, type BalanceablePlayer } from "@matchmaker-worker/engine/balance";

// The seed app's INITIAL_PLAYERS, reduced to the fields the balancer needs.
const ROSTER: BalanceablePlayer[] = [
  { id: "1", name: "L. Messi", position: "FWD", rating: 94 },
  { id: "2", name: "C. Ronaldo", position: "FWD", rating: 92 },
  { id: "3", name: "K. De Bruyne", position: "MID", rating: 91 },
  { id: "4", name: "V. van Dijk", position: "DEF", rating: 90 },
  { id: "5", name: "K. Mbappé", position: "FWD", rating: 93 },
  { id: "6", name: "T. Courtois", position: "GK", rating: 89 },
  { id: "7", name: "J. Bellingham", position: "MID", rating: 88 },
  { id: "8", name: "Rúben Dias", position: "DEF", rating: 89 },
  { id: "9", name: "E. Haaland", position: "FWD", rating: 91 },
  { id: "10", name: "Rodrigo", position: "MID", rating: 89 },
  { id: "11", name: "Alisson Becker", position: "GK", rating: 88 },
  { id: "12", name: "A. Davies", position: "ALL", rating: 85 },
];

describe("draftBalancedTeams", () => {
  it("splits an even roster into equal-size teams", () => {
    const { teams } = draftBalancedTeams(ROSTER, 2);
    expect(teams).toHaveLength(2);
    expect(teams[0]!.players.length).toBe(6);
    expect(teams[1]!.players.length).toBe(6);
  });

  it("keeps team sizes within one of each other for any team count", () => {
    for (const count of [2, 3, 4]) {
      const { teams } = draftBalancedTeams(ROSTER, count);
      const sizes = teams.map((t) => t.players.length);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  it("distributes goalkeepers across separate teams", () => {
    const { teams } = draftBalancedTeams(ROSTER, 2);
    const gkPerTeam = teams.map((t) => t.players.filter((p) => p.position === "GK").length);
    expect(gkPerTeam).toEqual([1, 1]);
  });

  it("produces a tight rating spread on a balanced roster", () => {
    const { ratingSpread } = draftBalancedTeams(ROSTER, 2);
    expect(ratingSpread).toBeLessThanOrEqual(2);
  });

  it("is deterministic — same roster always drafts the same teams", () => {
    const a = draftBalancedTeams(ROSTER, 2);
    const b = draftBalancedTeams(ROSTER, 2);
    const ids = (r: typeof a) => r.teams.map((t) => t.players.map((p) => p.id).sort());
    expect(ids(a)).toEqual(ids(b));
  });

  it("assigns the platform's default team names", () => {
    const { teams } = draftBalancedTeams(ROSTER, 2);
    expect(teams[0]!.name).toBe("Home Team");
    expect(teams[1]!.name).toBe("Away Team");
  });

  it("honors supplied team names and clamps team count into range", () => {
    const over = draftBalancedTeams(ROSTER, 99);
    expect(over.teams.length).toBe(8);
    const named = draftBalancedTeams(ROSTER, 2, ["Reds", "Blues"]);
    expect(named.teams.map((t) => t.name)).toEqual(["Reds", "Blues"]);
  });

  it("computes squadRating as the rounded average OVR", () => {
    const { teams } = draftBalancedTeams(ROSTER, 2);
    for (const team of teams) {
      const expected = Math.round(team.players.reduce((a, p) => a + p.rating, 0) / team.players.length);
      expect(team.squadRating).toBe(expected);
    }
  });
});
