"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { PlayerPosition } from "@saas/contracts/matchmaker";
import {
  GK_ATTRIBUTE_KEYS,
  OUTFIELD_ATTRIBUTE_KEYS,
} from "@saas/contracts/matchmaker";

/** Attribute keys expected for a position class. */
export function attributeKeysFor(position: PlayerPosition): readonly string[] {
  return position === "GK" ? GK_ATTRIBUTE_KEYS : OUTFIELD_ATTRIBUTE_KEYS;
}

/** Client-side OVR preview (server recomputes authoritatively on write). */
export function previewOvr(attributes: Record<string, number>): number {
  const values = Object.values(attributes);
  if (values.length === 0) return 1;
  const avg = Math.round(values.reduce((a, v) => a + v, 0) / values.length);
  return Math.max(1, Math.min(99, avg));
}

/** Small position chip colors (mirrors the seed app). */
export const POSITION_BADGE: Record<PlayerPosition, string> = {
  GK: "bg-yellow-500/20 text-yellow-300",
  DEF: "bg-blue-500/20 text-blue-300",
  MID: "bg-green-500/20 text-green-300",
  FWD: "bg-red-500/20 text-red-300",
  ALL: "bg-cyan-500/20 text-cyan-300",
};

/** FUT-style rarity gradient driven by OVR + position. */
function rarityClass(position: PlayerPosition, rating: number): string {
  if (position === "ALL") return "from-cyan-500 via-teal-700 to-cyan-950 border-cyan-400 text-cyan-50";
  if (rating >= 90) return "from-amber-400 via-yellow-600 to-amber-950 border-amber-300 text-amber-50";
  if (rating >= 80) return "from-yellow-600 to-yellow-950 border-yellow-500 text-white";
  if (rating < 75) return "from-amber-900 via-orange-950 to-neutral-900 border-amber-800 text-amber-100";
  return "from-neutral-700 to-neutral-900 border-neutral-500 text-neutral-100";
}

export interface PlayerCardModel {
  name: string;
  position: PlayerPosition;
  rating: number;
  attributes?: Record<string, number>;
}

export function CompactPlayerCard({ player }: { player: PlayerCardModel }) {
  return (
    <div
      className={cn(
        "relative flex w-28 items-center gap-1.5 overflow-hidden rounded-xl border-b-4 bg-gradient-to-br p-2 shadow-lg",
        rarityClass(player.position, player.rating),
      )}
    >
      <span className={cn("rounded px-1 py-0.5 text-[9px] font-black", POSITION_BADGE[player.position])}>
        {player.position}
      </span>
      <span className="flex-1 truncate text-[11px] font-extrabold tracking-tight" title={player.name}>
        {player.name}
      </span>
      <span className="text-sm font-black tracking-tighter">{player.rating}</span>
    </div>
  );
}

export function PlayerCard({
  player,
  actions,
}: {
  player: PlayerCardModel;
  actions?: React.ReactNode;
}) {
  const keys = attributeKeysFor(player.position);
  const attrs = player.attributes ?? {};
  return (
    <div className="group relative w-full">
      <div
        className={cn(
          "flex h-64 w-full flex-col items-center justify-between overflow-hidden rounded-b-2xl rounded-t-[2rem] border-2 bg-gradient-to-b p-4 shadow-xl transition-transform duration-300 group-hover:-translate-y-1",
          rarityClass(player.position, player.rating),
        )}
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex flex-col items-center leading-none">
            <span className="text-4xl font-black tracking-tighter">{player.rating}</span>
            <span className="mt-1 text-[10px] font-black uppercase tracking-widest opacity-80">
              {player.position}
            </span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-inner">
            <div className="h-3.5 w-3.5 rotate-45 rounded-sm bg-lime-400/80" />
          </div>
        </div>

        <div className="mt-3 w-full border-t border-white/10 pt-3">
          <div className="grid grid-cols-3 gap-x-1.5 gap-y-2 text-center">
            {keys.map((key) => (
              <div key={key} className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase opacity-60">{key}</span>
                <span className="text-sm font-black text-lime-300">{attrs[key] ?? "–"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto w-full border-t border-white/25 pt-2">
          <h3 className="w-full truncate text-center text-xs font-black uppercase tracking-wider drop-shadow">
            {player.name}
          </h3>
        </div>
      </div>

      {actions ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-b-2xl rounded-t-[2rem] bg-neutral-950/80 p-3 text-center opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
