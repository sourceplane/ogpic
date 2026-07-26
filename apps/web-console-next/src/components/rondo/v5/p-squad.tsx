/*
 * PSquad — the player's v5 "night-pitch" read-only Squad screen (design-
 * reference lines 494-522, spec §2; docs/design/rondo-rating-window-spec.md
 * requirement 5): mirrors `MSquad`'s layout — search, position filter chips
 * (ALL/GK/DEF/MID/FWD), a "SHOWING n OF m" count line, and a roster row per
 * player (avatar, name, position, role/status tag, OVR) — but with none of
 * the manager affordances: no `+ Add`/`+ Invite`, no join-requests panel, and
 * a row tap pushes the read-only `PPlayerView` (`nav('pview:' + playerId)`)
 * instead of `MEdit`. The role/status tag reuses `MSquad`'s own `squadTag`
 * derivation verbatim (exported from there) rather than duplicating it.
 */
"use client";

import * as React from "react";
import type { Position, RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO } from "./kit5";
import { PlayerCard, squadTag } from "./m-squad";

const POS_FILTERS: Position[] = ["ALL", "GK", "DEF", "MID", "FWD"];

export function PSquad({ vm, nav }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Position>("ALL");

  const squad = vm.players;
  const needle = q.trim().toLowerCase();
  const filtered = squad.filter((p) => (filter === "ALL" || p.pos === filter) && (needle === "" || p.name.toLowerCase().includes(needle)));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between", flex: "none" }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.9, color: C5.ink }}>Squad</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.5) }}>{squad.length}</span>
      </div>

      <div
        style={{
          margin: "12px 24px 0",
          height: 44,
          borderRadius: 14,
          background: "var(--rk-row-grad)",
          boxShadow: "var(--rk-row-sheen)",
          border: `1px solid ${ink(0.12)}`,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 9,
          flex: "none",
        }}
      >
        <Icon name="search" size={14} color={ink(0.4)} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${squad.length} players…`}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: C5.ink }}
        />
      </div>

      <div style={{ margin: "10px 24px 0", display: "flex", gap: 6, flex: "none" }}>
        {POS_FILTERS.map((p) => {
          const on = p === filter;
          return (
            <div
              key={p}
              onClick={() => setFilter(p)}
              style={{
                height: 32,
                padding: "0 13px",
                borderRadius: 16,
                background: on ? C5.panel : "transparent",
                border: `1px solid ${on ? C5.ink : ink(0.14)}`,
                color: on ? C5.ink : ink(0.55),
                display: "flex",
                alignItems: "center",
                fontFamily: MONO,
                fontSize: 9.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {p}
            </div>
          );
        })}
      </div>

      <div style={{ margin: "10px 24px 0", fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: ink(0.4), flex: "none" }}>
        SHOWING {filtered.length} OF {squad.length}
      </div>

      {/* Same card grid the manager sees — a player taps through to the
       *  read-only profile rather than the edit screen. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "10px 24px 16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "auto",
          gap: 11,
          alignContent: "start",
        }}
      >
        {filtered.map((p) => (
          <PlayerCard key={p.id} p={p} tag={squadTag(p, vm)} onOpen={() => nav(`pview:${p.id}`)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: 30, fontSize: 13, color: ink(0.5) }}>No players match.</div>
        )}
      </div>
    </div>
  );
}
