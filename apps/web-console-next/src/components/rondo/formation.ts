/*
 * Pitch placement — turns a roster (any size) into positioned tokens for the
 * PitchCanvas. Live squads vary, so we group by position into rows (GK · DEF ·
 * MID · FWD) and spread each row evenly across the width, instead of the fixed
 * canvas coordinates. Used by the manager/player Home pitch.
 */

export type PitchSlot = {
  id: string;
  initials: string;
  label: string;
  left: string;
  top: string;
  team: "home" | "gold" | "muted" | "you";
  captain: boolean;
  dimmed: boolean;
  size?: number;
};

type RosterPlayer = {
  id: string;
  initials: string;
  shortName?: string;
  name: string;
  ovr: number;
  pos: string;
  isCaptain?: boolean;
};

const ROWS: { pos: string; top: number }[] = [
  { pos: "GK", top: 13 },
  { pos: "DEF", top: 35 },
  { pos: "MID", top: 57 },
  { pos: "FWD", top: 80 },
];

/** Even horizontal spread for `n` tokens in a row (percent left positions). */
function spread(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [50];
  const pad = 15; // keep tokens off the touchline
  const step = (100 - pad * 2) / (n - 1);
  return Array.from({ length: n }, (_, i) => Math.round(pad + i * step));
}

/**
 * Place the roster on the pitch. `availOf` dims players who are not "in";
 * `youId` renders one token as the viewer; the captain is flagged.
 */
export function placeRoster(
  players: RosterPlayer[],
  opts: { availOf?: (id: string) => string; youId?: string | null } = {},
): PitchSlot[] {
  const { availOf, youId } = opts;
  // bucket by row position; anything unusual (ALL/blank) → MID
  const buckets: Record<string, RosterPlayer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) {
    const key = p.pos === "GK" || p.pos === "DEF" || p.pos === "FWD" ? p.pos : "MID";
    buckets[key]!.push(p);
  }
  const slots: PitchSlot[] = [];
  for (const row of ROWS) {
    const list = buckets[row.pos]!;
    const xs = spread(list.length);
    list.forEach((p, i) => {
      const avail = availOf ? availOf(p.id) : "in";
      const isYou = youId != null && p.id === youId;
      slots.push({
        id: p.id,
        initials: p.initials,
        label: `${p.shortName ?? p.name.split(" ").pop() ?? p.name} ${p.ovr}`,
        left: `${xs[i]}%`,
        top: `${row.top}%`,
        team: isYou ? "you" : avail === "in" ? "home" : "muted",
        captain: !!p.isCaptain,
        dimmed: avail !== "in" && !isYou,
        ...(isYou ? { size: 52 } : {}),
      });
    });
  }
  return slots;
}

/** Split home/away rosters onto the two halves for the Draft screen. */
export function placeDraft(home: RosterPlayer[], away: RosterPlayer[]): { home: PitchSlot[]; away: PitchSlot[] } {
  const half = (list: RosterPlayer[], topBase: number, topSpan: number): PitchSlot[] => {
    // simple stacked rows within a half (GK-ish first)
    const rows = Math.min(4, Math.max(1, Math.ceil(list.length / 3)));
    const perRow = Math.ceil(list.length / rows);
    const out: PitchSlot[] = [];
    for (let r = 0; r < rows; r++) {
      const rowItems = list.slice(r * perRow, (r + 1) * perRow);
      const xs = spread(rowItems.length);
      const top = topBase + (topSpan / (rows + 1)) * (r + 1);
      rowItems.forEach((p, i) => {
        out.push({
          id: p.id,
          initials: p.initials,
          label: `${p.shortName ?? p.name.split(" ").pop() ?? p.name} ${p.ovr}`,
          left: `${xs[i]}%`,
          top: `${Math.round(top)}%`,
          team: "home",
          captain: !!p.isCaptain,
          dimmed: false,
        });
      });
    }
    return out;
  };
  return {
    home: half(home, 4, 38),
    away: half(away, 54, 38),
  };
}
