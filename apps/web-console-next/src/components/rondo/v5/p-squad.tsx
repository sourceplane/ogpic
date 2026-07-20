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
import { Pressable, Stagger } from "./anim5";
import { squadTag } from "./m-squad";

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
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>Squad</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.5) }}>{squad.length}</span>
      </div>

      <div
        style={{
          margin: "12px 24px 0",
          height: 44,
          borderRadius: 14,
          background: C5.card,
          border: `1px solid ${ink(0.14)}`,
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
                background: on ? C5.green : C5.card,
                border: on ? "none" : `1px solid ${ink(0.12)}`,
                color: on ? C5.surface : ink(0.55),
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

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 24px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
        <Stagger style={{ flex: "none" }}>
        {filtered.map((p) => {
          const tag = squadTag(p, vm);
          const isGhost = !p.email;
          return (
            <Pressable
              key={p.id}
              onClick={() => nav(`pview:${p.id}`)}
              style={{
                borderRadius: 14,
                background: C5.card,
                border: `1px solid ${ink(0.1)}`,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 11,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#E5E3D2",
                  border: isGhost ? `2px dashed ${ink(0.22)}` : `1px solid ${ink(0.1)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: C5.ink,
                  flex: "none",
                }}
              >
                {p.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 1 }}>{p.pos}</div>
              </div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 8,
                  fontWeight: 700,
                  padding: "4px 7px",
                  borderRadius: 8,
                  background: tag.bg,
                  color: tag.fg,
                  flex: "none",
                }}
              >
                {tag.label}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C5.ink, flex: "none" }}>{p.ovr}</span>
              <span style={{ fontSize: 13, color: ink(0.35), flex: "none" }}>›</span>
            </Pressable>
          );
        })}
        </Stagger>
        {filtered.length === 0 && <div style={{ textAlign: "center", marginTop: 30, fontSize: 13, color: ink(0.5) }}>No players match.</div>}
      </div>
    </div>
  );
}
