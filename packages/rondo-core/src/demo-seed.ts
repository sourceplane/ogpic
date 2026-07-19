/*
 * Demo seed for the Pitchside app — feeds the same useRondo view-model the
 * authenticated route uses, so the token-free demo runs the exact live code path
 * (just with a canned roster). Mirrors the design canvas roster.
 */
import type { RondoSeed } from "./use-rondo";
import type { Player, Position } from "./logic";

const R = (id: string, name: string, pos: Position, ovr: number, cap = false): Player => ({
  id,
  name,
  pos,
  ovr,
  skills: { PAC: 3, SHO: 3, PAS: 4, DRI: 3, DEF: 3, STA: 4 },
  myStars: {},
  isCaptain: cap,
});

const DEMO_PLAYERS: Player[] = [
  R("p_rm", "Ravi Menon", "GK", 87),
  R("p_kb", "Kai Brandt", "DEF", 86),
  R("p_nk", "Nils Klein", "DEF", 77),
  R("p_dc", "Diego Costa", "DEF", 84),
  R("p_yd", "Yusuf Demir", "MID", 88),
  R("p_so", "Sam Okafor", "MID", 83),
  R("p_tn", "Tomas Nowak", "MID", 79),
  R("p_ap", "Andre Pirlo", "MID", 85),
  R("p_ah", "Adnan Hassan", "FWD", 80),
  R("p_lf", "Luis Fernandes", "FWD", 81),
  R("p_ms", "Marco Silva", "FWD", 91, true),
  R("p_jb", "Jonas Berg", "FWD", 82),
];

export const DEMO_SEED: RondoSeed = {
  teamName: "Northside FC",
  players: DEMO_PLAYERS,
  startScreen: "squad",
  availability: { p_lf: "maybe", p_tn: "maybe" },
  joinCode: "RON-4F2",
  joinRequests: [
    { id: "jr_cb", name: "Chris Boateng", via: "VIA CODE" },
    { id: "jr_pn", name: "Pavel Novak", via: "VIA LINK" },
  ],
  matches: [
    { id: "m1", dateLabel: "05 JUL", score: "4 – 3", color: "#17694A", venue: "Riverside Astro", mapsUrl: null, phase: "played", progressStep: 100, label: "05 JUL", subLabel: "Riverside Astro" },
    { id: "m2", dateLabel: "28 JUN", score: "2 – 2", color: "#8A8D93", venue: "Riverside Astro", mapsUrl: null, phase: "played", progressStep: 100, label: "28 JUN", subLabel: "Riverside Astro" },
    { id: "m3", dateLabel: "21 JUN", score: "1 – 2", color: "#B0512F", venue: "Riverside Astro", mapsUrl: null, phase: "played", progressStep: 100, label: "21 JUN", subLabel: "Riverside Astro" },
  ],
  votingOpen: true,
  // v5: no live poll/dropout data in the demo flow; chat starts empty and the
  // WhatsApp bridge defaults off.
  chat: [],
  orgSettings: { whatsappBridge: false },
};
