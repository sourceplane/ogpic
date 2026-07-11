// Server-side share-payload generation. Pure. Replaces the seed app's
// client-side `generateShareText` so every channel (console, CLI, future bot,
// future public link) renders byte-identical text from one code path.

import type { PlayerPosition } from "@saas/contracts/matchmaker";

export interface ShareablePlayer {
  name: string;
  position: PlayerPosition;
  rating: number;
}

export interface ShareableTeam {
  name: string;
  players: ShareablePlayer[];
}

export interface ShareableMatch {
  scheduledAt: Date;
  ratingA: number;
  ratingB: number;
  teamA: ShareableTeam;
  teamB: ShareableTeam;
}

export const SHARE_SUBJECT = "MatchMaker: Squad Distribution & Fixture Details";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Deterministic UTC date/time strings (no locale/timezone dependence). */
export function formatKickoff(date: Date): { date: string; time: string } {
  const weekday = WEEKDAYS[date.getUTCDay()]!;
  const month = MONTHS[date.getUTCMonth()]!;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return { date: `${weekday}, ${month} ${day}, ${year}`, time: `${hh}:${mm} UTC` };
}

function teamBlock(label: string, ovr: number, team: ShareableTeam): string {
  const divider = "---------------------------------";
  const roster = team.players
    .map((p) => `• [${p.position}] ${p.name} (OVR: ${p.rating})`)
    .join("\n");
  return `${divider}\n${label} (OVR ${Math.round(ovr)})\n${divider}\n${roster}`;
}

/** Build the emoji fixture summary (same shape as the seed app's share text). */
export function buildShareText(match: ShareableMatch): string {
  const { date, time } = formatKickoff(match.scheduledAt);
  return (
    `🏆 MATCHMAKER FIXTURE DETAILS 🏆\n\n` +
    `📅 Date: ${date}\n` +
    `⏰ Time: ${time}\n\n` +
    `${teamBlock(`🔵 ${match.teamA.name}`, match.ratingA, match.teamA)}\n\n` +
    `${teamBlock(`🔴 ${match.teamB.name}`, match.ratingB, match.teamB)}\n\n` +
    `Prepared with MatchMaker. Let's see you on the pitch! ⚽🔥`
  );
}

export function buildShareLinks(text: string): { whatsappUrl: string; mailtoUrl: string } {
  const encoded = encodeURIComponent(text);
  return {
    whatsappUrl: `https://api.whatsapp.com/send?text=${encoded}`,
    mailtoUrl: `mailto:?subject=${encodeURIComponent(SHARE_SUBJECT)}&body=${encoded}`,
  };
}
