/*
 * TeamSelectScreen — the initial team selection (canvas 2a language). After
 * sign-in a member picks which squad to open, or starts / joins another. Built
 * from the design's squad row (the Join "recent invites" card) plus the Start
 * screen's create / join cards. Presentational — the entry page supplies the
 * live org list + actions.
 */
"use client";

import * as React from "react";
import { C, ink, green, PhoneShell, StatusBar, ScreenBody, Avatar, Icon } from "./kit";
import { ProfileSheet } from "./profile-menu";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type SelectTeam = { slug: string; name: string };

function crestOf(name: string) {
  return (name.trim()[0] ?? "R").toUpperCase();
}

export function TeamSelectScreen({
  teams,
  onOpen,
  onCreate,
  onJoin,
}: {
  teams: SelectTeam[];
  onOpen: (slug: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const [profileOpen, setProfileOpen] = React.useState(false);
  return (
    <PhoneShell>
      <StatusBar />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <div style={{ padding: "22px 26px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, color: C.ink, lineHeight: 1.15 }}>Your squads</div>
          <div style={{ marginTop: 8, fontSize: 13.5, color: ink(0.55) }}>Pick a squad to open, or start / join another.</div>
        </div>
        <div onClick={() => setProfileOpen(true)} className="rk-press" aria-label="Your profile" style={{ flex: "none" }}>
          <Avatar initials="ME" size={40} bg={C.card} ring={ink(0.14)} />
        </div>
      </div>

      <ScreenBody style={{ padding: "18px 24px 26px" }}>
        {/* Primary actions — always at the top for quick access. */}
        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={onCreate} className="rk-press" style={{ flex: 1, borderRadius: 18, background: C.green, color: C.onDark, padding: "16px 14px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -26, top: -26, width: 84, height: 84, border: "2px solid rgba(242,244,241,.16)", borderRadius: "50%" }} />
            <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(242,244,241,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="squad" size={17} color={C.onDark} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, marginTop: 12 }}>Create team</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: "rgba(242,244,241,.7)", marginTop: 3 }}>YOU&rsquo;LL BE MANAGER</div>
          </div>
          <div onClick={onJoin} className="rk-press" style={{ flex: 1, borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "16px 14px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: green(0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="share" size={16} color={C.green} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, marginTop: 12, color: C.ink }}>Join team</div>
            <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1, color: ink(0.45), marginTop: 3 }}>WITH A CODE</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 14px" }}>
          <div style={{ flex: 1, height: 1, background: ink(0.12) }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: ink(0.4) }}>YOUR SQUADS · {teams.length}</span>
          <div style={{ flex: 1, height: 1, background: ink(0.12) }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {teams.map((t) => (
            <div
              key={t.slug}
              onClick={() => onOpen(t.slug)}
              className="rk-press"
              style={{ borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13 }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 14, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: C.onDark }}>{crestOf(t.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.5), marginTop: 2 }}>OPEN SQUAD</div>
              </div>
              <Icon name="chevronRight" size={16} color={ink(0.35)} stroke={2.2} />
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", padding: "22px 0 0", fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>YOU CAN BE IN SEVERAL SQUADS AT ONCE</div>
      </ScreenBody>
    </PhoneShell>
  );
}
