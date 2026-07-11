/*
 * Rondo domain logic — types, seed roster, and the pure helpers ported verbatim
 * from the prototype's `Component` class (design-reference.md §B/§C). The
 * balancing draft here mirrors the reference `balance()`; the authoritative
 * server engine is `apps/matchmaker-worker/src/engine/balance.ts` (MM2). Keeping
 * this pure and dependency-free lets the whole experience run without a backend
 * (demo mode) and gives the live-data wiring a clean shape to target.
 */

export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Availability = "in" | "maybe" | "out";
export type Skills = Record<string, number>;

export interface Player {
  id: string;
  name: string;
  pos: Position;
  ovr: number;
  skills: Skills;
  myStars: Skills;
}

export interface Tier {
  accent: string;
  bg: string;
  label: "ELITE" | "GOLD" | "SILVER" | "BRONZE";
}

export const OUTFIELD_SKILLS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;
export const GK_SKILLS = ["DIV", "HAN", "KIC", "REF", "SPD", "POS"] as const;

export const ACCENT_OPTIONS = ["#56C98D", "#E7C979", "#6EA8FF", "#FF7A6B"] as const;

export const SEED_PLAYERS: Player[] = [
  { id: "p1", name: "Marco Silva", pos: "FWD", ovr: 91, skills: { PAC: 92, SHO: 91, PAS: 83, DRI: 93, DEF: 36, PHY: 72 }, myStars: {} },
  { id: "p2", name: "Yusuf Demir", pos: "MID", ovr: 88, skills: { PAC: 80, SHO: 82, PAS: 89, DRI: 88, DEF: 66, PHY: 74 }, myStars: {} },
  { id: "p3", name: "Kai Brandt", pos: "DEF", ovr: 86, skills: { PAC: 78, SHO: 52, PAS: 74, DRI: 70, DEF: 88, PHY: 85 }, myStars: {} },
  { id: "p4", name: "Ravi Menon", pos: "GK", ovr: 87, skills: { DIV: 86, HAN: 84, KIC: 79, REF: 89, SPD: 52, POS: 88 }, myStars: {} },
  { id: "p5", name: "Andre Pirlo", pos: "MID", ovr: 85, skills: { PAC: 70, SHO: 78, PAS: 90, DRI: 85, DEF: 70, PHY: 72 }, myStars: {} },
  { id: "p6", name: "Sam Okafor", pos: "DEF", ovr: 83, skills: { PAC: 82, SHO: 44, PAS: 70, DRI: 68, DEF: 84, PHY: 86 }, myStars: {} },
  { id: "p7", name: "Diego Costa", pos: "FWD", ovr: 84, skills: { PAC: 84, SHO: 86, PAS: 72, DRI: 80, DEF: 40, PHY: 83 }, myStars: {} },
  { id: "p8", name: "Leo Fernandes", pos: "MID", ovr: 81, skills: { PAC: 79, SHO: 74, PAS: 82, DRI: 83, DEF: 64, PHY: 70 }, myStars: {} },
  { id: "p9", name: "Tomas Nowak", pos: "DEF", ovr: 79, skills: { PAC: 74, SHO: 48, PAS: 68, DRI: 66, DEF: 80, PHY: 82 }, myStars: {} },
  { id: "p10", name: "Jon Berg", pos: "FWD", ovr: 82, skills: { PAC: 88, SHO: 81, PAS: 70, DRI: 79, DEF: 42, PHY: 76 }, myStars: {} },
  { id: "p11", name: "Ali Hassan", pos: "MID", ovr: 80, skills: { PAC: 81, SHO: 72, PAS: 80, DRI: 81, DEF: 66, PHY: 71 }, myStars: {} },
  { id: "p12", name: "Noah Klein", pos: "DEF", ovr: 77, skills: { PAC: 72, SHO: 46, PAS: 66, DRI: 64, DEF: 79, PHY: 80 }, myStars: {} },
];

export function tierOf(ovr: number): Tier {
  if (ovr >= 90) return { accent: "#E7C979", bg: "linear-gradient(158deg,#302C1F 0%,#14120C 80%)", label: "ELITE" };
  if (ovr >= 84) return { accent: "#C6A15A", bg: "linear-gradient(158deg,#211F17 0%,#121109 80%)", label: "GOLD" };
  if (ovr >= 78) return { accent: "#AEB4BD", bg: "linear-gradient(158deg,#1E2127 0%,#111316 80%)", label: "SILVER" };
  return { accent: "#B98457", bg: "linear-gradient(158deg,#231A13 0%,#130E0A 80%)", label: "BRONZE" };
}

export function posColor(pos: Position): string {
  return ({ GK: "#E0C074", DEF: "#6EA8FF", MID: "#56C98D", FWD: "#FF7A6B" } as const)[pos] ?? "#9A9DA3";
}

export function skillsFor(pos: Position): readonly string[] {
  return pos === "GK" ? GK_SKILLS : OUTFIELD_SKILLS;
}

export function shortName(name: string): string {
  const parts = name.split(" ");
  if (parts.length > 1) return `${parts[0]!.charAt(0)}. ${parts[1]}`;
  return name;
}

export function initials(name: string): string {
  const parts = name.split(" ");
  const a = parts[0]?.charAt(0) ?? "";
  const b = parts[1]?.charAt(0) ?? "";
  return (a + b).toUpperCase();
}

/**
 * The balancing draft (reference `balance()`): take the `in` players, sort by
 * OVR desc, greedily push each to the smaller side; tie on size → push to the
 * side with the lower running OVR total. Caps each side at `teamSize`.
 */
export function balance(
  players: Player[],
  availOf: (id: string) => Availability,
  teamSize: number,
): { homeIds: string[]; awayIds: string[] } {
  const avail = players.filter((p) => availOf(p.id) === "in");
  const sorted = [...avail].sort((a, b) => b.ovr - a.ovr);
  const cap = teamSize;
  const h: string[] = [];
  const a: string[] = [];
  let hs = 0;
  let as = 0;
  sorted.forEach((p) => {
    const hFull = h.length >= cap;
    const aFull = a.length >= cap;
    if (hFull && aFull) return;
    if (aFull || (!hFull && hs <= as)) {
      h.push(p.id);
      hs += p.ovr;
    } else {
      a.push(p.id);
      as += p.ovr;
    }
  });
  return { homeIds: h, awayIds: a };
}

export const AVAIL_META: Record<Availability, { label: string; color: string; bg: string; bd: string }> = {
  in: { label: "Available", color: "#56C98D", bg: "rgba(86,201,141,.14)", bd: "rgba(86,201,141,.3)" },
  maybe: { label: "Maybe", color: "#E0C074", bg: "rgba(224,192,116,.14)", bd: "rgba(224,192,116,.3)" },
  out: { label: "Out", color: "#FF7A6B", bg: "rgba(255,122,107,.14)", bd: "rgba(255,122,107,.3)" },
};

export type Screen =
  | "login"
  | "join"
  | "squad"
  | "vote"
  | "play"
  | "match"
  | "fixtures"
  | "members"
  | "community";

export interface Goal {
  id: string;
  team: "home" | "away";
  name: string;
  min: number;
}

export interface TeamMeta {
  id: string;
  name: string;
  crest: string;
  role: "Manager" | "Player";
  members: number;
  league: string;
  pts: number;
  rank: number;
  streak: number;
  accentCol: string;
}

export const SEED_TEAMS: TeamMeta[] = [
  { id: "northside", name: "Northside FC", crest: "N", role: "Manager", members: 12, league: "Sunday League · 7-a-side", pts: 1840, rank: 4, streak: 3, accentCol: "#56C98D" },
  { id: "vets", name: "Vets United", crest: "V", role: "Player", members: 18, league: "Vets · 5-a-side", pts: 1210, rank: 11, streak: 0, accentCol: "#E0C074" },
];
