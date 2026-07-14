/*
 * ManagerApp — the manager surface (canvas 2b) on the Pitchside v2 kit, driven
 * by the live useRondo view-model (roster, availability, fixtures, join code /
 * requests, and the backend handlers). Home · Schedule · Draft · Manage squad.
 * In demo mode the same VM runs on the canned seed; in the authenticated app it
 * runs on the org's real data.
 */
"use client";

import * as React from "react";
import type { RondoVM } from "./use-rondo";
import { TeamSwitcher, type TeamNav } from "./team-switcher";
import { AddPlayerSheet } from "./add-player";
import { PlayerScoreSheet, type EditablePlayer } from "./player-edit";
import { MatchResultSheet } from "./match-result";
import { ProfileSheet } from "./profile-menu";
import { RateView, GamesView } from "./views";
import { placeRoster, placeDraft } from "./formation";
import {
  C,
  ink,
  rust,
  green,
  PhoneShell,
  StatusBar,
  ScreenBody,
  ScreenHeader,
  MonoLabel,
  Chip,
  Button,
  FieldRow,
  Avatar,
  Icon,
  MapCard,
  PitchCanvas,
  PlayerToken,
  BottomNavManager,
  type ManagerTab,
} from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";
const TIMES = ["17:00", "18:30", "20:00"];
const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type View = "pitch" | "squad" | "schedule" | "draft" | "rate" | "games" | "settings";

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "R";
}

export function ManagerApp({ vm, teamNav }: { vm: RondoVM; teamNav?: TeamNav | undefined }) {
  const [view, setView] = React.useState<View>("pitch");
  const [switcher, setSwitcher] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [scoreTarget, setScoreTarget] = React.useState<EditablePlayer | null>(null);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profilePlayers = vm.players.map((p) => ({ name: p.name, email: p.email ?? null, ovr: p.ovr, pos: p.pos, skills: p.skills, stats: vm.playerStats[p.id] }));
  const [day, setDay] = React.useState(0);
  const [time, setTime] = React.useState(1);
  const [turf, setTurf] = React.useState("Riverside Astro");
  const [copied, setCopied] = React.useState(false);
  const [teamsSaved, setTeamsSaved] = React.useState(false);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Auto-balance when the draft opens with no sides yet.
  React.useEffect(() => {
    if (view === "draft" && !vm.balanced && !vm.drafting) vm.doBalance();
  }, [view]);

  // Upcoming 7 days (client-computed to avoid SSR/CSR drift).
  const days = React.useMemo(() => {
    if (!mounted) return [];
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { d, wd: WD[d.getDay()]!, n: d.getDate() };
    });
  }, [mounted]);

  const team = vm.activeTeamName;
  const slots = placeRoster(vm.players, { availOf: vm.availOf });
  const nextMatch = vm.liveMatches?.[0] ?? null;

  function copy() {
    if (!vm.joinCode) return;
    void navigator.clipboard?.writeText(vm.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function doSchedule() {
    const chosen = days[day]?.d ?? new Date();
    const [hh, mm] = (TIMES[time] ?? "18:30").split(":");
    const dt = new Date(chosen);
    dt.setHours(Number(hh), Number(mm), 0, 0);
    const ok = vm.onSchedule?.({ scheduledAt: dt.toISOString(), venue: { name: turf.trim() || "TBC", address: null, booked: false, mapsUrl: null } });
    Promise.resolve(ok).finally(() => setView("draft"));
  }

  const navActive: ManagerTab =
    view === "rate" ? "rate" : view === "games" ? "games" : view === "squad" ? "squad" : "pitch";
  const nav = (
    <BottomNavManager active={navActive} onKickoff={() => setView("schedule")} onSelect={(t) => setView(t)} />
  );

  if (view === "rate") return <RateView vm={vm} nav={nav} />;
  if (view === "games") return <GamesView vm={vm} nav={nav} managerNote={false} />;

  /* ── SCHEDULE ── */
  if (view === "schedule") {
    return (
      <PhoneShell>
        <StatusBar />
        <ScreenHeader title="Schedule a match" onBack={() => setView("pitch")} />
        <ScreenBody style={{ padding: "18px 24px 24px" }}>
          <MonoLabel>WHEN</MonoLabel>
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            {(mounted ? days : Array.from({ length: 7 }, () => null)).map((dd, i) => {
              const on = i === day;
              return (
                <div key={i} onClick={() => setDay(i)} className="rk-press" style={{ flex: 1, height: 56, borderRadius: 14, background: on ? C.ink : C.card, border: on ? "none" : `1px solid ${ink(0.1)}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, color: on ? "rgba(242,244,241,.6)" : ink(0.45) }}>{dd?.wd ?? "—"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: on ? C.onDark : ink(0.55) }}>{dd?.n ?? "·"}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            {TIMES.map((tt, i) => (
              <span key={tt} onClick={() => setTime(i)} className="rk-press">
                <Chip variant={i === time ? "green" : "outline"} style={{ padding: "8px 14px", fontSize: 10.5 }}>{tt}</Chip>
              </span>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <MonoLabel>WHERE</MonoLabel>
            <FieldRow icon={<Icon name="search" size={15} color={ink(0.45)} />} right={<span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 0.5, color: ink(0.4) }}>TURF NAME</span>} style={{ marginTop: 10 }}>
              <input value={turf} onChange={(e) => setTurf(e.target.value)} placeholder="Turf name" style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.ink }} />
            </FieldRow>
            <MapCard height={190} style={{ marginTop: 10 }} action={
              <div style={{ position: "absolute", right: 10, bottom: 10, height: 34, padding: "0 14px", borderRadius: 12, background: C.card, boxShadow: "0 4px 12px rgba(16,21,17,.15)", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="send" size={13} color={C.green} stroke={2.2} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>Move pin</span>
              </div>
            } />
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11.5, color: ink(0.55) }}>Pin the location in Google Maps</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>Open in Google Maps ↗</span>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <Button variant="green" onClick={doSchedule}>Schedule &amp; notify squad</Button>
            <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9, color: ink(0.45) }}>PLAYERS GET THE PIN &amp; SET AVAILABILITY IN ONE TAP</div>
          </div>
        </ScreenBody>
      </PhoneShell>
    );
  }

  /* ── DRAFT ── */
  if (view === "draft") {
    const { home, away } = placeDraft(vm.home, vm.away);
    return (
      <PhoneShell>
        <StatusBar />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C.ink }}>Draft</span>
          <Chip variant="outline" style={{ padding: "6px 12px", fontSize: 10.5, borderRadius: 16 }}>{vm.home.length} v {vm.away.length}</Chip>
        </div>
        <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.green }}>HOME</span>
          <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: C.ink, letterSpacing: -2 }}>{vm.homeAvg}<span style={{ color: ink(0.3) }}>:</span>{vm.awayAvg}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.rust }}>AWAY</span>
        </div>
        <div style={{ alignSelf: "center", marginTop: 6 }}>
          <Chip variant="greenSoft" style={{ borderRadius: 14 }}>{vm.balanceGap <= 2 ? "BALANCED" : "CLOSE"} · GAP {vm.balanceGap}</Chip>
        </div>
        <PitchCanvas variant="split" style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
          {home.map((p) => <PlayerToken key={p.id} initials={p.initials} name={p.label} filled team="home" size={44} left={p.left} top={p.top} captain={p.captain} />)}
          {away.map((p) => <PlayerToken key={p.id} initials={p.initials} name={p.label} filled team="away" size={44} left={p.left} top={p.top} captain={p.captain} />)}
        </PitchCanvas>
        <div style={{ textAlign: "center", marginTop: 10, fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>{vm.drafting ? "BALANCING…" : "AUTO-BALANCED BY RATING"}</div>
        <div style={{ display: "flex", gap: 10, padding: "12px 24px 0" }}>
          <div onClick={() => vm.doBalance()} className="rk-press" style={{ width: 52, height: 52, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, flex: "none" }} aria-label="Regenerate"><Icon name="refresh" size={18} /></div>
          {vm.canSaveTeams && (
            <Button variant="outline" height={52} radius={16} onClick={() => { vm.saveTeams(); setTeamsSaved(true); setTimeout(() => setTeamsSaved(false), 1500); }}>{teamsSaved ? "Saved ✓" : "Save teams"}</Button>
          )}
          <Button variant="ink" height={52} radius={16} onClick={() => { if (vm.canStartMatch) vm.startMatch(); setView("pitch"); }}>{vm.canStartMatch ? "Start match" : "Done"}</Button>
        </div>
        {vm.nextMatch && (
          <div style={{ textAlign: "center", marginTop: 8, fontFamily: MONO, fontSize: 9, color: ink(0.45) }}>
            {vm.nextMatch.status === "live" ? "MATCH IS LIVE" : vm.canSaveTeams ? "SAVE TEAMS ONTO THE SCHEDULED MATCH · KICK OFF WHEN READY" : "NO SCHEDULED MATCH — SCHEDULE ONE TO SAVE & START"}
          </div>
        )}
        {nav}
      </PhoneShell>
    );
  }

  /* ── MANAGE SQUAD ── */
  if (view === "squad") {
    const pending = (vm.joinRequests ?? []).filter((r) => !vm.invitesResolved[r.id]);
    return (
      <PhoneShell>
        <StatusBar />
        <AddPlayerSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={vm.addPlayer} />
        <PlayerScoreSheet player={scoreTarget} onClose={() => setScoreTarget(null)} onSave={vm.setPlayerScore} />
        <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C.ink }}>Squad</span>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 600, color: ink(0.5) }}>{vm.players.length} MEMBERS</span>
        </div>
        <ScreenBody style={{ padding: "0 24px 20px" }}>
          {vm.joinCode ? (
            <div style={{ margin: "16px 0 0", borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: ink(0.45) }}>INVITE CODE</div>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: 2, color: C.green, marginTop: 3 }}>{vm.joinCode}</div>
              </div>
              <div onClick={copy} className="rk-press" style={{ height: 40, padding: "0 16px", borderRadius: 12, background: C.green, color: C.onDark, display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700 }}><Icon name={copied ? "check" : "share"} size={13} stroke={copied ? 3 : 2} /> {copied ? "Copied" : "Share"}</div>
            </div>
          ) : vm.canManageCode ? (
            <div onClick={() => vm.rotateCode()} className="rk-press" style={{ margin: "16px 0 0", borderRadius: 18, background: C.card, border: `1px dashed ${green(0.4)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: green(0.12), display: "flex", alignItems: "center", justifyContent: "center", color: C.green, flex: "none" }}><Icon name="share" size={16} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Generate invite code</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 2 }}>SO PLAYERS CAN REQUEST TO JOIN</div>
              </div>
              <Icon name="chevronRight" size={16} color={ink(0.35)} />
            </div>
          ) : null}

          {pending.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <MonoLabel>PENDING · {pending.length}</MonoLabel>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {pending.map((p) => (
                  <div key={p.id} style={{ borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar initials={initialsOf(p.name)} size={36} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 1 }}>{p.via}</div>
                    </div>
                    <div onClick={() => vm.declineJoin(p.id)} className="rk-press" style={{ width: 34, height: 34, borderRadius: 11, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.rust }}><Icon name="x" size={14} /></div>
                    <div onClick={() => vm.approveJoin(p.id)} className="rk-press" style={{ width: 34, height: 34, borderRadius: 11, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", color: C.onDark }}><Icon name="check" size={14} stroke={3} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <MonoLabel>MEMBERS &amp; ROLES</MonoLabel>
              <div onClick={() => setAddOpen(true)} className="rk-press" style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", borderRadius: 12, background: C.green, color: C.onDark, fontSize: 11.5, fontWeight: 700 }}>
                <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span> Add player
              </div>
            </div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {vm.players.map((m) => (
                <div
                  key={m.id}
                  onClick={vm.canEditScore ? () => setScoreTarget({ id: m.id, name: m.name, pos: m.pos, skills: m.skills, stats: vm.playerStats[m.id] }) : undefined}
                  className={vm.canEditScore ? "rk-press" : undefined}
                  style={{ borderRadius: 14, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <Avatar initials={m.initials} size={34} ring={m.isCaptain ? C.green : undefined} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    {m.isCaptain && <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: C.green }}>CAPTAIN</span>}
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, color: m.posColor }}>{m.pos}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.ink, minWidth: 22, textAlign: "right" }}>{m.ovr}</span>
                  <div onClick={(e) => { e.stopPropagation(); vm.releasePlayer(m.id); }} className="rk-press" aria-label="Remove"><Icon name="trash" size={14} color={ink(0.35)} /></div>
                </div>
              ))}
            </div>
          </div>
        </ScreenBody>
        {nav}
      </PhoneShell>
    );
  }

  /* ── SETTINGS ── */
  if (view === "settings") {
    return (
      <PhoneShell>
        <StatusBar />
        <ScreenHeader title="Team settings" onBack={() => setView("pitch")} />
        <ScreenBody style={{ padding: "18px 24px 28px" }}>
          {/* Share code */}
          <MonoLabel>INVITE CODE</MonoLabel>
          {vm.joinCode ? (
            <div style={{ marginTop: 10, borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.5, color: ink(0.45) }}>SHARE TO INVITE PLAYERS</div>
                  <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: C.green, marginTop: 4 }}>{vm.joinCode}</div>
                </div>
                <div onClick={copy} className="rk-press" style={{ height: 42, padding: "0 16px", borderRadius: 13, background: C.green, color: C.onDark, display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, flex: "none" }}>
                  <Icon name={copied ? "check" : "share"} size={13} stroke={copied ? 3 : 2} /> {copied ? "Copied" : "Share"}
                </div>
              </div>
              {vm.canManageCode && (
                <div onClick={() => vm.rotateCode()} className="rk-press" style={{ marginTop: 12, height: 44, borderRadius: 13, background: C.surface, border: `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.ink }}>
                  <Icon name="refresh" size={14} /> Rotate code
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 11, color: ink(0.5), lineHeight: 1.4 }}>Anyone with this code can request to join. Rotating it invalidates the old one.</div>
            </div>
          ) : vm.canManageCode ? (
            <div style={{ marginTop: 10 }}>
              <Button variant="green" onClick={() => vm.rotateCode()}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="share" size={15} color={C.onDark} /> Generate invite code</span>
              </Button>
              <div style={{ marginTop: 8, fontSize: 11, color: ink(0.5) }}>Create a shareable code so players can request to join your squad.</div>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, color: ink(0.5) }}>No invite code yet.</div>
          )}

          {/* Rating window */}
          {vm.canManageRound && (
            <div style={{ marginTop: 26 }}>
              <MonoLabel>PLAYER RATINGS</MonoLabel>
              <div style={{ marginTop: 10, borderRadius: 18, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="rate" size={20} color={vm.votingOpen ? C.green : ink(0.4)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Rating window</div>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: vm.votingOpen ? C.green : ink(0.45), marginTop: 2 }}>{vm.votingOpen ? "OPEN — PLAYERS CAN VOTE" : "CLOSED"}</div>
                </div>
                <div onClick={() => (vm.votingOpen ? vm.closeRound() : vm.openRound(false))} className="rk-press" style={{ height: 38, padding: "0 16px", borderRadius: 12, background: vm.votingOpen ? C.surface : C.green, border: vm.votingOpen ? `1px solid ${ink(0.14)}` : "none", color: vm.votingOpen ? C.ink : C.onDark, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, flex: "none" }}>
                  {vm.votingOpen ? "Close" : "Open"}
                </div>
              </div>
            </div>
          )}

          {/* Manage squad shortcut */}
          <div style={{ marginTop: 26 }}>
            <MonoLabel>TEAM</MonoLabel>
            <div onClick={() => setView("squad")} className="rk-press" style={{ marginTop: 10, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="squad" size={18} color={C.ink} />
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Manage squad &amp; roles</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: ink(0.45) }}>{vm.players.length}</span>
              <Icon name="chevronRight" size={15} color={ink(0.35)} />
            </div>
          </div>

          {/* Leave squad */}
          {vm.canLeave && (
            <div style={{ marginTop: 26 }}>
              <div onClick={() => vm.leaveTeam()} className="rk-press" style={{ borderRadius: 16, background: rust(0.08), border: `1px solid ${rust(0.22)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, justifyContent: "center", color: C.rust, fontSize: 13.5, fontWeight: 700 }}>
                <Icon name="logout" size={16} color={C.rust} /> Leave squad
              </div>
            </div>
          )}
        </ScreenBody>
      </PhoneShell>
    );
  }

  /* ── HOME (pitch) ── */
  return (
    <PhoneShell>
      <StatusBar />
      {teamNav && <TeamSwitcher open={switcher} onClose={() => setSwitcher(false)} nav={teamNav} />}
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={teamNav ? () => setSwitcher(true) : undefined} className={teamNav ? "rk-press" : undefined} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>{team}</span>
          <Icon name="chevronDown" size={14} color={ink(0.5)} stroke={2.4} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div onClick={() => setView("settings")} className="rk-press" aria-label="Team settings" style={{ width: 36, height: 36, borderRadius: 12, background: C.card, border: `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}>
            <Icon name="settings" size={17} />
          </div>
          <div onClick={() => setProfileOpen(true)} className="rk-press" aria-label="Your profile">
            <Avatar initials={initialsOf(team)} size={36} ring={C.gold} bg={C.card} />
          </div>
        </div>
      </div>
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} players={profilePlayers} />
      <div style={{ padding: "10px 24px 0", display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Chip variant="gold">MANAGER</Chip>
        <Chip>{vm.players.length} PLAYERS</Chip>
        <Chip variant="green">{vm.availableCount} IN</Chip>
        {vm.nextMatch?.status === "live" && <Chip variant="rustSoft">● LIVE</Chip>}
      </div>
      <PitchCanvas style={{ flex: 1, margin: "14px 20px 0", minHeight: 0 }}>
        {slots.map((p) => (
          <PlayerToken key={p.id} initials={p.initials} name={p.label} team={p.team} dimmed={p.dimmed} captain={p.captain} size={p.size} left={p.left} top={p.top} />
        ))}
      </PitchCanvas>
      <div style={{ margin: "12px 24px 0" }}>
        <FieldRow icon={<Icon name="pin" size={14} color={C.green} />} height={46} style={{ borderRadius: 14 }} right={<span style={{ fontFamily: MONO, fontSize: 9.5, color: C.green, fontWeight: 700 }}>{vm.availableCount} IN · {vm.maybeCount} MAYBE</span>}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600 }}>{nextMatch ? `${nextMatch.dateLabel} · ${nextMatch.venue ?? "TBC"}` : "NO MATCH SCHEDULED"}</span>
        </FieldRow>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div onClick={() => setView("schedule")} className="rk-press" style={{ flex: 1, height: 46, borderRadius: 14, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.ink }}>
            <Icon name="kickoff" size={15} color={C.green} /> Schedule
          </div>
          <div onClick={() => setView("draft")} className="rk-press" style={{ flex: 1, height: 46, borderRadius: 14, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.onDark }}>
            <Icon name="pitch" size={15} color={C.onDark} /> Draft teams
          </div>
        </div>
        {vm.canRecordResult && vm.nextMatch && (
          <div onClick={() => setResultOpen(true)} className="rk-press" style={{ marginTop: 10, height: 46, borderRadius: 14, background: vm.nextMatch.status === "live" ? C.green : C.card, border: vm.nextMatch.status === "live" ? "none" : `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: vm.nextMatch.status === "live" ? C.onDark : C.ink }}>
            <Icon name="rate" size={15} color={vm.nextMatch.status === "live" ? C.onDark : C.green} /> Record result
          </div>
        )}
      </div>
      <MatchResultSheet open={resultOpen} onClose={() => setResultOpen(false)} onSave={(a, b) => vm.recordResult(a, b)} />
      {nav}
    </PhoneShell>
  );
}
