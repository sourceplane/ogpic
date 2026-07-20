/*
 * MSquad — the manager's v5 "night-pitch" Squad screen (design-reference
 * lines 494-522, spec §2 screen 8): search, position filter chips (ALL/GK/
 * DEF/MID/FWD), a "SHOWING n OF m" count line, and a roster row per player
 * (ghost avatar ring, role/status tag, OVR, chevron) — tapping a row opens
 * Edit player. `+ Add` and `+ Invite` are host-managed flows (the add-player
 * sheet and the invite sheet live outside this screen), wired through the
 * `onAdd`/`onInvite` extra props, the same shape `MHome` already uses for
 * `onInvite`.
 *
 * Per-player role/status tag (spec: `MGR` gold / `WHATSAPP` green / `NO APP`
 * / `XI` / `RES`) isn't a single first-class field on `Player` yet — it's
 * derived from what the VM does carry, same convention `MDetail` already
 * established for the ghost/no-app read:
 *   - `MGR`: this row is the viewer's own claimed player, and the viewer is
 *     the manager (per-player org roles beyond the viewer's own aren't
 *     exposed by the VM today).
 *   - a player without an `email` is a no-app/ghost roster entry (same read
 *     as `MDetail`'s `isGhost`); tagged `WHATSAPP` when the org's WhatsApp
 *     mirror bridge is on, else `NO APP`.
 *   - otherwise: `XI` if they're in the next match's confirmed line-up
 *     (`vm.confirmedPlayers`, the existing v4 waitlist derivation), else
 *     `RES`.
 */
"use client";

import * as React from "react";
import type { Position, RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO } from "./kit5";

const POS_FILTERS: Position[] = ["ALL", "GK", "DEF", "MID", "FWD"];

type SquadRowVM = RondoVM["players"][number];

interface TagStyle {
  label: string;
  bg: string;
  fg: string;
}

/** The row's role/status tag — see the module doc comment for the derivation. */
function squadTag(p: SquadRowVM, vm: RondoVM): TagStyle {
  const isMe = !!vm.myPlayerId && p.id === vm.myPlayerId;
  if (isMe && vm.isManager) return { label: "MGR", bg: C5.goldBg, fg: C5.goldText };
  const isGhost = !p.email;
  if (isGhost) {
    return vm.settings.whatsappBridge
      ? { label: "WHATSAPP", bg: "rgba(37,211,102,.14)", fg: C5.waText }
      : { label: "NO APP", bg: ink(0.06), fg: ink(0.5) };
  }
  const isXI = vm.confirmedPlayers.some((c) => c.id === p.id);
  return isXI ? { label: "XI", bg: "rgba(30,138,94,.12)", fg: C5.green } : { label: "RES", bg: ink(0.06), fg: ink(0.45) };
}

export function MSquad({
  vm,
  nav,
  toast,
  onAdd,
  onInvite,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  onAdd: () => void;
  onInvite: () => void;
}) {
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Position>("ALL");

  const squad = vm.players;
  const needle = q.trim().toLowerCase();
  const filtered = squad.filter((p) => (filter === "ALL" || p.pos === filter) && (needle === "" || p.name.toLowerCase().includes(needle)));

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "baseline", justifyContent: "space-between", flex: "none" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>Squad</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.5) }}>{squad.length}</span>
          <div
            onClick={onAdd}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 11,
              background: C5.ink,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Add
          </div>
          <div
            onClick={onInvite}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 11,
              background: C5.green,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Invite
          </div>
        </div>
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

      {(vm.joinRequests?.length ?? 0) > 0 && (
        <div style={{ margin: "12px 24px 0", flex: "none" }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.5, color: C5.goldText }}>
            JOIN REQUESTS · {vm.joinRequests!.length}
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
            {vm.joinRequests!.map((r) => (
              <div key={r.id} style={{ borderRadius: 14, background: C5.card, border: `1.5px solid ${C5.gold}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: ink(0.5), marginTop: 1 }}>{r.via.toUpperCase()}</div>
                </div>
                <div
                  onClick={() => {
                    vm.approveJoin(r.id);
                    toast(`${r.name} approved — they're in`);
                  }}
                  style={{ height: 34, padding: "0 14px", borderRadius: 12, background: C5.green, color: C5.surface, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Approve
                </div>
                <div
                  onClick={() => {
                    vm.declineJoin(r.id);
                    toast(`${r.name} declined`);
                  }}
                  style={{ height: 34, padding: "0 12px", borderRadius: 12, border: `1px solid ${ink(0.16)}`, color: ink(0.6), display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Decline
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ margin: "10px 24px 0", fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: ink(0.4), flex: "none" }}>
        SHOWING {filtered.length} OF {squad.length} · TAP TO EDIT SCORE, POSITION &amp; ROLE
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 24px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
        {filtered.map((p) => {
          const tag = squadTag(p, vm);
          const isGhost = !p.email;
          return (
            <div
              key={p.id}
              onClick={() => nav(`edit:${p.id}`)}
              style={{
                borderRadius: 14,
                background: C5.card,
                border: `1px solid ${ink(0.1)}`,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 11,
                cursor: "pointer",
                flex: "none",
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
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", marginTop: 30, fontSize: 13, color: ink(0.5) }}>No players match.</div>}
      </div>
    </div>
  );
}
