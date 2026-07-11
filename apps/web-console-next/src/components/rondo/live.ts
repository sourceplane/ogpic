/*
 * Live-data adapter (RX2). Maps the real matchmaker API shapes (PublicPlayer,
 * the org) into the Rondo view-model's `RondoSeed`, so the same screens run on
 * the org's real roster instead of the demo seed. Voting / availability / live
 * scoring / community remain local state until their backend slices land.
 */
import type { PublicPlayer } from "@saas/contracts/matchmaker";
import type { Player, Position, TeamMeta } from "./logic";
import type { RondoSeed } from "./use-rondo";

export function mapPlayer(p: PublicPlayer): Player {
  return {
    id: p.id,
    name: p.name,
    pos: p.position as Position,
    ovr: p.rating,
    skills: { ...p.attributes },
    myStars: {},
  };
}

/**
 * Build a live seed from the org + its roster. The org *is* the squad; the
 * caller's RBAC role decides manager vs player affordances.
 */
export function buildLiveSeed(args: {
  orgName: string;
  players: PublicPlayer[];
  isManager: boolean;
}): RondoSeed {
  const team: TeamMeta = {
    id: "org",
    name: args.orgName,
    crest: (args.orgName.trim()[0] ?? "R").toUpperCase(),
    role: args.isManager ? "Manager" : "Player",
    members: args.players.length,
    league: "Your squad",
    pts: 0,
    rank: 0,
    streak: 0,
    accentCol: "#56C98D",
  };
  return {
    players: args.players.map(mapPlayer),
    teams: [team],
    teamName: args.orgName,
    startScreen: "squad",
  };
}
