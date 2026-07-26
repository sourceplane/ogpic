/*
 * MSquad — the manager's v5 Squad screen, on the v11 canvas: search, position
 * filter chips (ALL/GK/DEF/MID/FWD), a "SHOWING n OF m" count line, and a
 * two-column grid of collectible-style player cards (`PlayerCard` below) —
 * tapping a card opens Edit player. `+ Add` and `+ Invite` are host-managed
 * flows (the add-player sheet and the invite sheet live outside this screen),
 * wired through the `onAdd`/`onInvite` extra props, the same shape `MHome`
 * already uses for `onInvite`.
 *
 * The grid deliberately does not use `Stagger`: it wraps every child in a div,
 * which would become the grid item and stop the cards themselves stretching to
 * a shared row height, leaving ragged rows whenever a name wraps.
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
import { Pressable } from "./anim5";

const POS_FILTERS: Position[] = ["ALL", "GK", "DEF", "MID", "FWD"];

type SquadRowVM = RondoVM["players"][number];

export interface TagStyle {
  label: string;
  bg: string;
  fg: string;
}

/** The row's role/status tag — see the module doc comment for the derivation.
 *  Exported so the read-only player Squad screen (`PSquad`) reuses the exact
 *  same derivation instead of duplicating it. */
export function squadTag(p: SquadRowVM, vm: RondoVM): TagStyle {
  const isMe = !!vm.myPlayerId && p.id === vm.myPlayerId;
  if (isMe && vm.isManager) return { label: "MGR", bg: C5.goldBg, fg: C5.goldText };
  const isGhost = !p.email;
  if (isGhost) {
    return vm.settings.whatsappBridge
      ? { label: "WHATSAPP", bg: "rgba(37,211,102,.14)", fg: C5.waText }
      : { label: "NO APP", bg: ink(0.06), fg: ink(0.5) };
  }
  const isXI = vm.confirmedPlayers.some((c) => c.id === p.id);
  return isXI ? { label: "XI", bg: "rgba(var(--rk-green-rgb),.12)", fg: C5.green } : { label: "RES", bg: ink(0.06), fg: ink(0.45) };
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
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.9, color: C5.ink }}>Squad</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.5) }}>{squad.length}</span>
          <div
            onClick={onAdd}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 11,
              background: C5.ink,
              color: C5.onInk,
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
              background: "var(--rk-crest-team)",
              color: C5.onBrand,
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
                  style={{ height: 34, padding: "0 14px", borderRadius: 12, background: C5.green, color: C5.onBrand, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
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

      <div style={{ margin: "10px 24px 0", fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: ink(0.48), flex: "none" }}>
        SHOWING {filtered.length} OF {squad.length} · TAP A CARD TO EDIT SCORE, POSITION &amp; ROLE
      </div>

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
          <PlayerCard key={p.id} p={p} tag={squadTag(p, vm)} onOpen={() => nav(`edit:${p.id}`)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", marginTop: 30, fontSize: 13, color: ink(0.5) }}>No players match.</div>
        )}
      </div>
    </div>
  );
}

/**
 * The canvas's collectible-style squad card. The tier ramp (accent, card
 * gradient, ELITE/GOLD/SILVER/BRONZE label) is not invented here — it comes
 * from `tierOf` in rondo-core via the enriched player, so the card and the
 * rest of the app agree on what an 85 looks like.
 *
 * These cards stay dark in both themes on purpose: they are trading-card art,
 * the one surface the canvas renders as an object rather than as page chrome.
 * Everything inside is therefore written against the card, not against `ink()`.
 */
const CARD_INK = "#ECF0EC";
const CARD_INK_SOFT = "rgba(236,240,236,.42)";

/**
 * Attributes reach the card on two different scales: the live VM carries what
 * teammates actually voted (1-5, the scale the rating window writes), while the
 * static demo roster in rondo-core stores them already expanded to 0-99. The
 * card is a 0-99 surface — `ovr` next to it always is — so a raw 1-5 renders as
 * a lone "3" beside an 87 and reads like a bug.
 *
 * Expand the 1-5 values onto the same ramp the canvas uses (1→27 … 5→99) and
 * pass anything above 5 through untouched, so both sources render one scale.
 */
function statValue(v: number): number {
  return v <= 5 ? 9 + 18 * v : v;
}

export function PlayerCard({
  p,
  tag,
  onOpen,
}: {
  p: SquadRowVM;
  tag: TagStyle;
  onOpen?: (() => void) | undefined;
}) {
  const isGhost = !p.email;
  return (
    <Pressable
      onClick={onOpen}
      style={{
        position: "relative",
        boxSizing: "border-box",
        borderRadius: 18,
        padding: "13px 12px 11px",
        background: p.cardBg,
        border: "1px solid rgba(255,255,255,.08)",
        boxShadow: "0 8px 22px -12px rgba(0,0,0,.7)",
        cursor: onOpen ? "pointer" : "default",
      }}
    >
      {/* tier bar along the top edge */}
      <div style={{ position: "absolute", top: 0, left: 16, right: 16, height: 2, borderRadius: 2, background: p.tierAccent }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 0.85, letterSpacing: -1.6, color: p.tierAccent }}>{p.ovr}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, color: p.posColor, marginTop: 5 }}>{p.pos}</div>
          <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 1, color: CARD_INK_SOFT, marginTop: 3 }}>{p.tierLabel}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flex: "none" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background:
                "repeating-linear-gradient(45deg,rgba(255,255,255,.05),rgba(255,255,255,.05) 4px,rgba(0,0,0,.18) 4px,rgba(0,0,0,.18) 8px)",
              // a roster entry with no account keeps the dashed "ghost" ring
              border: isGhost ? "1.5px dashed rgba(236,240,236,.35)" : "1px solid rgba(255,255,255,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#E7E5E0",
            }}
          >
            {p.initials}
          </div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 7,
              fontWeight: 700,
              padding: "3px 6px",
              borderRadius: 7,
              background: tag.bg,
              color: tag.fg,
              whiteSpace: "nowrap",
            }}
          >
            {tag.label}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 4,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,.1)",
        }}
      >
        {p.statList.map((s) => (
          <div key={s.k} style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 8, color: CARD_INK_SOFT }}>{s.k.slice(0, 3).toUpperCase()}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: CARD_INK }}>{statValue(s.v)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, textAlign: "center", fontSize: 13, fontWeight: 700, color: CARD_INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {p.name}
      </div>
    </Pressable>
  );
}
