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
}

/** The signed-in account shown in the hub header. */
export interface AccountInfo {
  name: string;
  email: string | null;
  onSignOut: () => void;
}

const CREST_COLORS = [C5.green, C5.rust, "#2A78D6", "#7C3AED", "#0EA5E9"];

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
          background: "#E4EBE3",
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
          background: "rgba(176,81,47,.08)",
          border: "1px solid rgba(176,81,47,.28)",
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
          <div style={{ fontSize: 25, fontWeight: 700, letterSpacing: -0.7, color: C5.ink }}>Your teams</div>
          <div style={{ marginTop: 3, fontSize: 12.5, color: ink(0.55) }}>
            {teams.length === 1 ? "Tap to open, or start another below." : "Pick a squad to open."}
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <Stagger style={{ flex: "none" }}>
            {teams.map((t, i) => {
              const manager = isManagerRole(t.role);
              const current = t.slug === currentSlug;
              return (
                <Pressable
                  key={t.slug}
                  onClick={() => onOpen(t.slug)}
                  style={{
                    borderRadius: 20,
                    background: C5.card,
                    border: current ? `1.5px solid ${C5.green}` : `1px solid ${ink(0.12)}`,
                    boxShadow: current ? "0 6px 18px -10px rgba(23,105,74,.5)" : "0 1px 2px rgba(16,21,17,.05)",
                    padding: 15,
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 16,
                      background: CREST_COLORS[i % CREST_COLORS.length],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                      fontWeight: 700,
                      color: C5.surface,
                      flex: "none",
                    }}
                  >
                    {crestOf(t.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16.5, fontWeight: 700, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.name}
                    </div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7 }}>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 8,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: manager ? C5.goldBg : "rgba(23,105,74,.12)",
                          color: manager ? C5.goldText : C5.green,
                        }}
                      >
                        {manager ? "MANAGER" : "PLAYER"}
                      </span>
                      {current && <span style={{ fontFamily: MONO, fontSize: 8, color: ink(0.4) }}>CURRENT</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 20, color: ink(0.28), flex: "none" }}>›</span>
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
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, color: ink(0.4), letterSpacing: 1, marginBottom: 9 }}>
            START SOMETHING NEW
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Pressable
              onClick={onCreate}
              style={{ flex: 1, borderRadius: 18, background: C5.green, padding: "16px 14px", cursor: "pointer", position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", right: -28, top: -28, width: 90, height: 90, border: "2px solid rgba(242,244,241,.15)", borderRadius: "50%" }} />
              <Icon name="plus" size={19} color={C5.surface} stroke={2.3} />
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C5.surface, marginTop: 9 }}>Create a team</div>
              <div style={{ fontSize: 10.5, color: "rgba(242,244,241,.7)", marginTop: 2 }}>You&rsquo;ll be manager</div>
            </Pressable>
            <Pressable
              onClick={onJoin}
              style={{ flex: 1, borderRadius: 18, background: C5.card, border: `1.5px dashed ${ink(0.22)}`, padding: "16px 14px", cursor: "pointer" }}
            >
              <Icon name="link" size={19} color={C5.ink} stroke={2} />
              <div style={{ fontSize: 14.5, fontWeight: 700, color: C5.ink, marginTop: 9 }}>Join a team</div>
              <div style={{ fontSize: 10.5, color: ink(0.5), marginTop: 2 }}>Code or link</div>
            </Pressable>
          </div>
        </div>
      </div>
    </div>
  );
}
