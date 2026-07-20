/*
 * Hub5 — the v5 "Your teams" screen (design reference lines 54-88). Lists
 * EVERY squad the member belongs to with a MANAGER/PLAYER role chip, plus the
 * Create-a-team (green) and Join-a-team (dashed) cards. Used full-screen by
 * the /rondo start page and in-shell by RondoApp5's hub navigation.
 */
"use client";

import * as React from "react";
import { C5, ink, Icon, MONO } from "./kit5";

export interface HubTeam {
  slug: string;
  name: string;
  role?: string | undefined;
}

const CREST_COLORS = [C5.green, C5.rust, "#2563EB", "#7C3AED", "#0EA5E9"];

function crestOf(name: string): string {
  return (name.trim()[0] ?? "R").toUpperCase();
}

function isManagerRole(role?: string): boolean {
  return role === "owner" || role === "admin";
}

export function Hub5({
  teams,
  currentSlug,
  onOpen,
  onCreate,
  onJoin,
}: {
  teams: HubTeam[];
  currentSlug?: string | undefined;
  onOpen: (slug: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: C5.surface }}>
      <div style={{ padding: "16px 24px 0" }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>Your teams</div>
        <div style={{ marginTop: 4, fontSize: 12.5, color: ink(0.55) }}>Pick a team, create one, or join with a code.</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {teams.map((t, i) => {
          const manager = isManagerRole(t.role);
          const current = t.slug === currentSlug;
          return (
            <div
              key={t.slug}
              onClick={() => onOpen(t.slug)}
              style={{ borderRadius: 20, background: C5.card, border: `1px solid ${ink(current ? 0.25 : 0.12)}`, padding: 16, display: "flex", alignItems: "center", gap: 13, cursor: "pointer", flex: "none" }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 15, background: CREST_COLORS[i % CREST_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: C5.surface }}>
                {crestOf(t.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C5.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.5), marginTop: 2 }}>{current ? "CURRENT TEAM" : "TAP TO OPEN"}</div>
              </div>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 8.5,
                  fontWeight: 700,
                  padding: "4px 9px",
                  borderRadius: 10,
                  background: manager ? C5.goldBg : "rgba(30,138,94,.12)",
                  color: manager ? C5.goldText : C5.green,
                }}
              >
                {manager ? "MANAGER" : "PLAYER"}
              </span>
              <span style={{ fontSize: 13, color: ink(0.35) }}>›</span>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <div onClick={onCreate} style={{ flex: 1, borderRadius: 20, background: C5.green, padding: "18px 16px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -30, top: -30, width: 110, height: 110, border: "2px solid rgba(245,242,233,.15)", borderRadius: "50%" }} />
            <Icon name="plus" size={20} color={C5.surface} stroke={2.2} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C5.surface, marginTop: 10 }}>Create a team</div>
            <div style={{ fontSize: 11, color: "rgba(245,242,233,.7)", marginTop: 3 }}>You&rsquo;ll be its manager</div>
          </div>
          <div onClick={onJoin} style={{ flex: 1, borderRadius: 20, background: C5.card, border: `2px dashed ${ink(0.2)}`, padding: "18px 16px", cursor: "pointer" }}>
            <Icon name="link" size={20} color={C5.ink} stroke={2} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C5.ink, marginTop: 10 }}>Join a team</div>
            <div style={{ fontSize: 11, color: ink(0.5), marginTop: 3 }}>Code or invite link</div>
          </div>
        </div>
      </div>
    </div>
  );
}
