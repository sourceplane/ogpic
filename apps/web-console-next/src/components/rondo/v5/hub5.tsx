/*
 * Hub5 — the v5 "Your teams" screen. A slim account header (profile photo,
 * name, email, sign out) sits above the real focus of the page: a clean,
 * tappable list of every squad the member belongs to with a MANAGER/PLAYER
 * chip, then a compact New-team / Join row. Used full-screen by the /rondo
 * entry page and in-shell by RondoApp5's "switch team" hub — the account
 * header only renders when an `account` is supplied (the /rondo entry).
 */
"use client";

import * as React from "react";
import { initials } from "@saas/rondo-core";
import { C5, ink, Icon, MONO } from "./kit5";
import { Pressable, Stagger } from "./anim5";

export interface HubTeam {
  slug: string;
  name: string;
  role?: string | undefined;
  /** Mono meta line under the name, e.g. "42 MEMBERS · 2 MATCHES LIVE".
   *  Optional: the /rondo org list has no counts to build it from. */
  meta?: string | undefined;
}

/** The signed-in account shown in the hub header. */
export interface AccountInfo {
  name: string;
  email: string | null;
  onSignOut: () => void;
}

const CREST_COLORS = [C5.green, C5.rust, C5.blue, "#7C3AED", "#0EA5E9"];

function crestOf(name: string): string {
  return (name.trim()[0] ?? "R").toUpperCase();
}

function isManagerRole(role?: string): boolean {
  return role === "owner" || role === "admin";
}

function AccountHeader({ name, email, onSignOut }: AccountInfo) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0 2px" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: C5.sage,
          border: `2.5px solid ${C5.gold}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: C5.ink,
          flex: "none",
        }}
      >
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        {email && (
          <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email}
          </div>
        )}
      </div>
      <Pressable
        onClick={onSignOut}
        title="Sign out"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 34,
          padding: "0 12px",
          borderRadius: 12,
          background: "rgba(var(--rk-rust-rgb),.08)",
          border: "1px solid rgba(var(--rk-rust-rgb),.28)",
          color: C5.rust,
          cursor: "pointer",
          flex: "none",
        }}
      >
        <Icon name="logout" size={14} color={C5.rust} />
        <span style={{ fontSize: 11.5, fontWeight: 700 }}>Sign out</span>
      </Pressable>
    </div>
  );
}

export function Hub5({
  teams,
  currentSlug,
  onOpen,
  onCreate,
  onJoin,
  account,
}: {
  teams: HubTeam[];
  currentSlug?: string | undefined;
  onOpen: (slug: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  /** When set, renders the account header (profile photo, name, email, sign
   *  out) — used by the standalone /rondo entry page. */
  account?: AccountInfo | undefined;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: C5.surface }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 22px calc(20px + env(safe-area-inset-bottom))" }}>
        {account && <AccountHeader {...account} />}

        <div style={{ marginTop: account ? 18 : 4 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.9, color: C5.ink }}>Your teams</div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: ink(0.58) }}>Pick a team, create one, or join with a code.</div>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <Stagger style={{ flex: "none" }}>
            {teams.map((t, i) => {
              const manager = isManagerRole(t.role);
              const current = t.slug === currentSlug;
              // The canvas gives the manager's own club the brand crest and
              // tints the rest from the palette, so a list of squads still
              // reads apart at a glance.
              const crest = manager ? "var(--rk-crest-team)" : CREST_COLORS[i % CREST_COLORS.length]!;
              // The canvas's mono meta line ("42 MEMBERS · 2 MATCHES LIVE").
              // Only a caller with a loaded VM can supply real counts, so the
              // line falls back to marking the open team and is otherwise
              // omitted rather than showing invented numbers.
              const metaLine = t.meta ?? (current ? "CURRENT TEAM" : null);
              return (
                <Pressable
                  key={t.slug}
                  onClick={() => onOpen(t.slug)}
                  style={{
                    borderRadius: 20,
                    background: "var(--rk-row-grad)",
                    border: current ? `1.5px solid ${C5.green}` : `1px solid ${ink(0.1)}`,
                    boxShadow: current ? "0 6px 18px -10px rgba(var(--rk-green-rgb),.5)" : "var(--rk-row-sheen)",
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 15,
                      background: crest,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                      fontWeight: 700,
                      color: C5.onBrand,
                      flex: "none",
                    }}
                  >
                    {crestOf(t.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.name}
                    </div>
                    {metaLine && <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.58), marginTop: 2 }}>{metaLine}</div>}
                  </div>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 8.5,
                      fontWeight: 700,
                      padding: "4px 9px",
                      borderRadius: 10,
                      background: manager ? "rgba(var(--rk-gold-rgb),.18)" : "rgba(var(--rk-green-rgb),.12)",
                      color: manager ? C5.goldText : C5.green,
                      flex: "none",
                    }}
                  >
                    {manager ? "MANAGER" : "PLAYER"}
                  </span>
                  <span style={{ fontSize: 13, color: ink(0.42), flex: "none" }}>›</span>
                </Pressable>
              );
            })}
          </Stagger>

          {teams.length === 0 && (
            <div style={{ borderRadius: 20, background: C5.card, border: `1px dashed ${ink(0.18)}`, padding: "22px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C5.ink }}>No squads yet</div>
              <div style={{ marginTop: 3, fontSize: 12, color: ink(0.5) }}>Create one or join with a code below.</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Pressable
              onClick={onCreate}
              style={{ flex: 1, borderRadius: 20, background: "var(--rk-crest-team)", padding: "18px 16px", cursor: "pointer", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", right: -30, top: -30, width: 110, height: 110, border: "2px solid rgba(255,255,255,.18)", borderRadius: "50%" }} />
              <Icon name="plus" size={20} color={C5.onBrand} stroke={2.2} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C5.onBrand, marginTop: 10 }}>Create a team</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 3 }}>You&rsquo;ll be its manager</div>
            </Pressable>
            <Pressable
              onClick={onJoin}
              style={{ flex: 1, borderRadius: 20, background: C5.card, border: `2px dashed ${ink(0.15)}`, padding: "18px 16px", cursor: "pointer" }}
            >
              <Icon name="link" size={20} color={C5.ink} stroke={2} />
              <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink, marginTop: 10 }}>Join a team</div>
              <div style={{ fontSize: 11, color: ink(0.58), marginTop: 3 }}>Code or invite link</div>
            </Pressable>
          </div>
        </div>
      </div>
    </div>
  );
}
