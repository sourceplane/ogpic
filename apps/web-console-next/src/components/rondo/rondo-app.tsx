/*
 * RondoApp — the real responsive shell hosting the screens. One tree, two
 * layouts (rondo.css): full-bleed + bottom tab bar on mobile; a persistent left
 * sidebar + wide fluid content on desktop. No device frame. Standalone and
 * token-free: runs on the seed roster so the whole loop is demoable.
 */
"use client";

import * as React from "react";
import { CalendarDays, Compass, Globe, Shield, Star } from "lucide-react";
import { useRondo, type RondoSeed } from "./use-rondo";
import type { Screen } from "./logic";
import { Avatar, BottomSheet, Mono } from "./ui";
import {
  CommunityScreen,
  FixturesScreen,
  JoinScreen,
  LoginScreen,
  MatchScreen,
  MembersScreen,
  PlayScreen,
  SquadScreen,
  VoteScreen,
} from "./screens";

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

const NAV: { key: Screen; label: string; Icon: IconType }[] = [
  { key: "squad", label: "SQUAD", Icon: Shield },
  { key: "vote", label: "VOTE", Icon: Star },
  { key: "play", label: "PLAY", Icon: Compass },
  { key: "community", label: "FEED", Icon: Globe },
  { key: "fixtures", label: "FIXTURES", Icon: CalendarDays },
];

export function RondoApp({ seed }: { seed?: RondoSeed }) {
  const vm = useRondo(seed);
  const showNav = ["squad", "vote", "play", "match", "fixtures", "community"].includes(vm.screen);

  const active = (k: Screen) => (k === "play" ? vm.screen === "play" || vm.screen === "match" : vm.screen === k);
  const navColor = (k: Screen) => (active(k) ? "#F4F3F0" : "#5A5D63");

  return (
    <div className="rondo-root">
      <div className={`rondo-shell ${showNav ? "has-nav" : "no-nav"}`}>
        {showNav && <Sidebar vm={vm} />}

        <div className="rondo-main rondo-scroll">
          <div className="rondo-page">
            {vm.screen === "login" && <LoginScreen vm={vm} />}
            {vm.screen === "join" && <JoinScreen vm={vm} />}
            {vm.screen === "squad" && <SquadScreen vm={vm} />}
            {vm.screen === "vote" && <VoteScreen vm={vm} />}
            {vm.screen === "play" && <PlayScreen vm={vm} />}
            {vm.screen === "match" && <MatchScreen vm={vm} />}
            {vm.screen === "fixtures" && <FixturesScreen vm={vm} />}
            {vm.screen === "members" && <MembersScreen vm={vm} />}
            {vm.screen === "community" && <CommunityScreen vm={vm} />}
          </div>
        </div>

        {showNav && (
          <nav className="rondo-bottomnav" aria-label="Primary">
            {NAV.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => vm.go(key)}
                aria-current={active(key) ? "page" : undefined}
                style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: navColor(key) }}
              >
                <Icon size={22} strokeWidth={1.9} color={navColor(key)} />
                <Mono style={{ fontSize: 9, letterSpacing: ".5px" }}>{label}</Mono>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* overlays (fixed to viewport) */}
      {vm.showTeams && (
        <BottomSheet onClose={() => vm.setShowTeams(false)}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-.4px" }}>Your teams</div>
          <div style={{ fontSize: 12, color: "#8A8D93", marginTop: 3 }}>You can be in as many squads as you like.</div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 9 }}>
            {vm.teamsData.map((t) => {
              const current = t.id === vm.currentTeam;
              return (
                <button key={t.id} onClick={() => vm.selectTeam(t.id)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 15, background: "#1A1D21", border: `1.5px solid ${current ? "rgba(86,201,141,.4)" : "rgba(255,255,255,.08)"}`, cursor: "pointer" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17, color: t.accentCol }}>{t.crest}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#F4F3F0" }}>{t.id === "northside" ? vm.teamName : t.name}</div>
                    <Mono style={{ fontSize: 10, color: "#8A8D93", marginTop: 2, display: "block" }}>{t.role} · {t.members} MEMBERS</Mono>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={current ? "#56C98D" : "transparent"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => { vm.setShowTeams(false); vm.go("join"); }} style={{ flex: 1, height: 50, borderRadius: 14, background: "#141619", border: "1px solid rgba(255,255,255,.12)", color: "#F4F3F0", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>Join a squad</button>
            <button onClick={() => vm.setShowTeams(false)} style={{ flex: 1, height: 50, borderRadius: 14, background: "#56C98D", border: "none", color: "#07130D", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>Create team</button>
          </div>
        </BottomSheet>
      )}

      {vm.voteTargetP && (
        <BottomSheet onClose={() => vm.setVoteTarget(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: vm.voteTargetP.cardBg, border: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#EDECE8" }}>{vm.voteTargetP.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-.4px" }}>{vm.voteTargetP.name}</div>
              <Mono style={{ fontSize: 11, color: vm.voteTargetP.posColor, marginTop: 2, display: "block" }}>{vm.voteTargetP.pos} · CURRENT OVR {vm.voteTargetP.ovr}</Mono>
            </div>
            <button onClick={() => vm.setVoteTarget(null)} style={{ width: 34, height: 34, borderRadius: 10, background: "#1C1F23", border: "1px solid rgba(255,255,255,.08)", color: "#9A9DA3", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            {vm.voteSkills.map((sk) => {
              const val = vm.voteTargetP!.myStars[sk] || 0;
              return (
                <div key={sk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Mono style={{ fontSize: 13, fontWeight: 700, color: "#C9CBCE", letterSpacing: ".5px" }}>{sk}</Mono>
                  <div style={{ display: "flex", gap: 7 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} onClick={() => vm.setVote(sk, i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, lineHeight: 1, padding: 2, color: val >= i ? "#E7C979" : "#2A2E34" }} aria-label={`${sk} ${i} stars`}>★</button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={vm.submitVote} style={{ width: "100%", height: 54, marginTop: 24, border: "none", borderRadius: 15, background: "#56C98D", color: "#07130D", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Submit vote</button>
        </BottomSheet>
      )}

      {vm.scorer && (
        <BottomSheet onClose={() => vm.setScorer(null)}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-.4px" }}>Who scored?</div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {(vm.scorer === "home" ? vm.home : vm.away).map((p) => (
              <button key={p.id} onClick={() => vm.pickScorer(p)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", borderRadius: 13, background: "#1A1D21", border: "1px solid rgba(255,255,255,.07)", cursor: "pointer" }}>
                <Avatar initials={p.initials} size={34} fontSize={11} color="#C9CBCE" />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#F4F3F0" }}>{p.name}</span>
                <Mono style={{ fontSize: 11, color: p.posColor }}>{p.pos}</Mono>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/* Desktop-only left sidebar: brand, team switcher, vertical nav. */
function Sidebar({ vm }: { vm: ReturnType<typeof useRondo> }) {
  const active = (k: Screen) => (k === "play" ? vm.screen === "play" || vm.screen === "match" : vm.screen === k);
  const t = vm.activeTeam;
  return (
    <aside className="rondo-sidebar">
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "2px 8px 14px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(150deg,#1E2228,#101215)", border: "1px solid rgba(86,201,141,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 19, color: "#F4F3F0" }}>R</div>
        <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-1px", color: "#F4F3F0" }}>RONDO</span>
      </div>

      <button onClick={() => vm.setShowTeams(true)} style={{ display: "flex", alignItems: "center", gap: 11, padding: 10, borderRadius: 14, background: "var(--r-surface-1)", border: "1px solid var(--r-line)", cursor: "pointer", textAlign: "left", marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(150deg,#1C2A22,#0F1512)", border: "1px solid rgba(86,201,141,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: t.accentCol, fontSize: 16 }}>{t.crest}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#F4F3F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vm.activeTeamName}</div>
          <Mono style={{ fontSize: 9.5, color: "#8A8D93", display: "block" }}>{t.role.toUpperCase()} · {t.members} MEMBERS</Mono>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8D93" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {NAV.map(({ key, label, Icon }) => {
        const on = active(key);
        return (
          <button
            key={key}
            onClick={() => vm.go(key)}
            aria-current={on ? "page" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, background: on ? "rgba(86,201,141,.12)" : "transparent", border: `1px solid ${on ? "rgba(86,201,141,.25)" : "transparent"}`, color: on ? "#F4F3F0" : "#9A9DA3", cursor: "pointer", textAlign: "left" }}
          >
            <Icon size={20} strokeWidth={2} color={on ? "#56C98D" : "#8A8D93"} />
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.1px" }}>{label.charAt(0) + label.slice(1).toLowerCase()}</span>
          </button>
        );
      })}

      <div style={{ flex: 1 }} />
      <button onClick={() => vm.go("members")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, background: "transparent", border: "1px solid transparent", color: "#9A9DA3", cursor: "pointer", textAlign: "left" }}>
        <Avatar initials="DS" size={28} fontSize={10} color="#8A8D93" />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Manage squad</span>
      </button>
    </aside>
  );
}
