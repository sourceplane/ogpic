/*
 * PlayerStatsSheet — a player's profile / stats view: OVR, attribute breakdown,
 * and their appearances + W/D/L record derived from played fixtures. Goals and
 * rating history aren't tracked server-side yet, so they're omitted rather than
 * faked. Presentational; the host passes the player + computed stats.
 */
"use client";

import * as React from "react";
import { C, ink, green, rust, Icon } from "./kit";
import type { PlayerStats } from "./use-rondo";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type StatsPlayer = {
  name: string;
  pos: string;
  ovr: number;
  skills: Record<string, number>;
};

function Tile({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ flex: 1, borderRadius: 14, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "12px 8px", textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: ink(0.45), marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function PlayerStatsSheet({
  player,
  stats,
  onClose,
}: {
  player: StatsPlayer | null;
  stats: PlayerStats | undefined;
  onClose: () => void;
}) {
  if (!player) return null;
  const s = stats ?? { apps: 0, wins: 0, draws: 0, losses: 0 };
  const winPct = s.apps > 0 ? Math.round((s.wins / s.apps) * 100) : 0;
  const keys = Object.keys(player.skills);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(16,21,17,.35)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rk-anim-rise"
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "88dvh", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 16px" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: ink(0.5), marginTop: 2 }}>{player.pos} · PLAYER STATS</div>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: ink(0.45) }}>OVR</div>
            <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: C.green, letterSpacing: -1, lineHeight: 1 }}>{player.ovr}</div>
          </div>
        </div>

        {/* record */}
        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <Tile label="PLAYED" value={s.apps} color={C.ink} />
          <Tile label="WON" value={s.wins} color={C.green} />
          <Tile label="DRAWN" value={s.draws} color={C.ink} />
          <Tile label="LOST" value={s.losses} color={C.rust} />
        </div>
        <div style={{ marginTop: 10, borderRadius: 14, background: green(0.1), padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: 1, color: C.green }}>WIN RATE</span>
          <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: C.green }}>{winPct}%</span>
        </div>

        {/* attributes */}
        <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>ATTRIBUTES</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
          {keys.map((k) => {
            const v = player.skills[k] ?? 0;
            return (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.6) }}>{k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: v >= 85 ? C.green : C.ink }}>{v}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: ink(0.08), overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", borderRadius: 4, background: v >= 85 ? C.green : v >= 65 ? "#C9A24B" : rust(0.8) }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontFamily: MONO, fontSize: 9, color: ink(0.4), lineHeight: 1.5 }}>
          APPEARANCES &amp; RESULTS FROM PLAYED MATCHES<br />GOALS &amp; RATING HISTORY COMING SOON
        </div>

        <div onClick={onClose} className="rk-press" style={{ marginTop: 16, height: 50, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.ink }}>
          <Icon name="chevronDown" size={16} /> Close
        </div>
      </div>
    </div>
  );
}
