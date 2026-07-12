/*
 * Rondo screens (RX1–RX8). Each is a pure function of the `useRondo` view-model.
 * Markup is ported from the prototype (design-reference.md §D) with exact inline
 * measurements; colors resolve through the scoped `--r-*` tokens. Icons use
 * lucide-react at the prototype's 22/18/16px sizes.
 */
"use client";

import * as React from "react";
import {
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import type { RondoVM, LiveMatchRow } from "./use-rondo";
import { AVAIL_META } from "./logic";
import { Avatar, IconChip, Mono } from "./ui";
import { PlayerCard } from "./player-card";

const ACCENT = "#56C98D";
const RISE = "r-anim-rise";

/* ------------------------------------------------------------------ Login */
export function LoginScreen({ vm }: { vm: RondoVM }) {
  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "96px 28px 40px",
        position: "relative",
        background: "radial-gradient(120% 70% at 50% 0%,#15191D 0%,#08090B 58%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(90deg,transparent 0 47px,rgba(255,255,255,.014) 47px 94px)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "linear-gradient(150deg,#1E2228,#101215)",
            border: "1px solid rgba(255,255,255,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 30px -8px rgba(0,0,0,.7)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: 18, boxShadow: "inset 0 0 0 1.5px rgba(86,201,141,.35)" }} />
          <span style={{ fontSize: 30, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-1px" }}>R</span>
        </div>
        <div style={{ marginTop: 26, fontSize: 52, fontWeight: 900, letterSpacing: "-3px", lineHeight: 0.9, color: "#F4F3F0" }}>RONDO</div>
        <div style={{ marginTop: 14, fontSize: 19, fontWeight: 600, color: "#D8D9DA", letterSpacing: "-.4px", maxWidth: 230, lineHeight: 1.25 }}>
          Balanced sides.
          <br />
          Every match.
        </div>
        <Mono style={{ marginTop: 12, fontSize: 11, color: "#63666C", letterSpacing: ".5px", display: "block" }}>
          SUNDAY-LEAGUE FOOTBALL, SORTED.
        </Mono>
      </div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 11 }}>
        <button
          onClick={() => vm.go("join")}
          style={{
            width: "100%",
            height: 54,
            border: "none",
            borderRadius: 15,
            background: "#F4F3F0",
            color: "#0B0C0E",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: "-.2px",
            cursor: "pointer",
          }}
        >
          Continue with phone
        </button>
        <div style={{ display: "flex", gap: 11 }}>
          {["Apple", "Google"].map((b) => (
            <button
              key={b}
              onClick={() => vm.go("join")}
              style={{
                flex: 1,
                height: 52,
                border: "1px solid rgba(255,255,255,.11)",
                borderRadius: 15,
                background: "#141619",
                color: "#F4F3F0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {b}
            </button>
          ))}
        </div>
        <button
          onClick={() => vm.go("squad")}
          className="rondo-mono"
          style={{ marginTop: 4, background: "none", border: "none", color: "#8A8D93", fontSize: 12, letterSpacing: ".3px", cursor: "pointer", padding: 8 }}
        >
          Explore a demo squad →
        </button>
        <div style={{ textAlign: "center", fontSize: 10.5, color: "#4E5157", lineHeight: 1.5, marginTop: 2 }}>
          By continuing you agree to the Terms &amp; Privacy Policy.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Join */
const RECENT_INVITES = [
  { crest: "N", name: "Northside FC", sub: "12 members · Sunday League", accent: "#56C98D", bg: "linear-gradient(150deg,#1C2A22,#101613)", bd: "rgba(86,201,141,.25)" },
  { crest: "V", name: "Vets United", sub: "18 members · 5-a-side", accent: "#E0C074", bg: "linear-gradient(150deg,#2A2320,#161210)", bd: "rgba(230,192,116,.2)" },
];

export function JoinScreen({ vm }: { vm: RondoVM }) {
  const code = ["R", "O", "N", "4", "", ""];
  return (
    <div style={{ minHeight: "100%", padding: "64px 24px 40px" }} className={RISE}>
      <IconChip onClick={() => vm.go("login")} ariaLabel="Back">
        <ChevronLeft size={18} strokeWidth={2.4} />
      </IconChip>
      <div style={{ marginTop: 26, fontSize: 30, fontWeight: 900, letterSpacing: "-1.4px", color: "#F4F3F0" }}>Join a squad</div>
      <div style={{ marginTop: 8, fontSize: 14, color: "#8A8D93", lineHeight: 1.45, maxWidth: 300 }}>
        Enter the invite code your captain shared, or paste a squad link.
      </div>

      <Mono style={{ marginTop: 28, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 10, display: "block" }}>INVITE CODE</Mono>
      <div style={{ display: "flex", gap: 8 }}>
        {code.map((c, i) => {
          const active = i === 3;
          const filled = c !== "";
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 60,
                borderRadius: 14,
                background: active ? "#0F1114" : "#141619",
                border: active ? "1.5px solid #56C98D" : "1px solid rgba(255,255,255,.09)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 800,
                color: active ? "#56C98D" : filled ? "#F4F3F0" : "#3A3E44",
                boxShadow: active ? "0 0 0 4px rgba(86,201,141,.12)" : undefined,
              }}
            >
              {c || (i > 3 ? ["F", "2"][i - 4] : "")}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
        <Mono style={{ fontSize: 11, color: "#5A5D63" }}>OR</Mono>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.08)" }} />
      </div>
      <div style={{ height: 52, borderRadius: 14, background: "#141619", border: "1px solid rgba(255,255,255,.09)", display: "flex", alignItems: "center", padding: "0 16px", gap: 10, color: "#63666C" }}>
        <Link2 size={16} strokeWidth={2} />
        <span style={{ fontSize: 14 }}>rondo.app/j/northside</span>
      </div>

      <Mono style={{ marginTop: 30, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 12, display: "block" }}>RECENT INVITES</Mono>
      {RECENT_INVITES.map((iv, i) => (
        <button
          key={iv.crest}
          onClick={() => vm.go("squad")}
          style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 13, padding: 12, borderRadius: 16, background: "#111316", border: "1px solid rgba(255,255,255,.08)", cursor: "pointer", marginBottom: i === 0 ? 10 : 0 }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 13, background: iv.bg, border: `1px solid ${iv.bd}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: iv.accent, fontSize: 17 }}>
            {iv.crest}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F4F3F0" }}>{iv.name}</div>
            <Mono style={{ fontSize: 11, color: "#8A8D93", marginTop: 2, display: "block" }}>{iv.sub}</Mono>
          </div>
          <ChevronRight size={18} strokeWidth={2.2} color="#5A5D63" />
        </button>
      ))}

      <button
        onClick={() => vm.go("squad")}
        style={{ width: "100%", height: 54, marginTop: 30, border: "none", borderRadius: 15, background: ACCENT, color: "#07130D", fontSize: 15, fontWeight: 800, letterSpacing: "-.2px", cursor: "pointer" }}
      >
        Join squad
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Squad */
export function SquadScreen({ vm }: { vm: RondoVM }) {
  const t = vm.activeTeam;
  return (
    <div style={{ minHeight: "100%", padding: "60px 20px 96px" }} className={RISE}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <button onClick={() => vm.setShowTeams(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 13, textAlign: "left" }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: "linear-gradient(150deg,#1C2A22,#0F1512)", border: "1px solid rgba(86,201,141,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: t.accentCol, fontSize: 20 }}>
            {t.crest}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: "-.8px", color: "#F4F3F0" }}>{vm.activeTeamName}</span>
              <ChevronDown size={15} strokeWidth={2.4} color="#8A8D93" />
            </div>
            <Mono style={{ fontSize: 11, color: "#8A8D93", marginTop: 2, display: "block" }}>{t.league}</Mono>
          </div>
        </button>
        <IconChip onClick={() => vm.go("members")} ariaLabel="Members">
          <Users size={19} strokeWidth={2} />
        </IconChip>
      </div>

      {/* record */}
      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        {[
          { v: 14, l: "PLAYED", c: "#F4F3F0" },
          { v: 9, l: "WON", c: "#56C98D" },
          { v: 2, l: "DRAWN", c: "#C9CBCE" },
          { v: 3, l: "LOST", c: "#FF7A6B" },
        ].map((s) => (
          <div key={s.l} style={{ flex: 1, background: "#111316", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
            <Mono style={{ fontSize: 10, color: "#8A8D93", marginTop: 1, display: "block" }}>{s.l}</Mono>
          </div>
        ))}
      </div>

      {/* ranking / streak */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1.5, background: "linear-gradient(150deg,#15211b,#0e1512)", border: "1px solid rgba(86,201,141,.22)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Mono style={{ fontSize: 9, color: "#8A9B92", letterSpacing: ".5px", display: "block" }}>RONDO POINTS</Mono>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-.5px", marginTop: 2 }}>{t.pts}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Mono style={{ fontSize: 9, color: "#8A9B92", letterSpacing: ".5px", display: "block" }}>LOCAL RANK</Mono>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#56C98D", marginTop: 3 }}>#{t.rank}</div>
          </div>
        </div>
        <div style={{ flex: 1, background: "#111316", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "13px 12px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#E0C074", letterSpacing: "-.5px" }}>W{t.streak}</div>
          <Mono style={{ fontSize: 9, color: "#8A8D93", marginTop: 4, letterSpacing: ".5px", display: "block" }}>WIN STREAK</Mono>
        </div>
      </div>

      {/* manager + captain */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        {[
          { i: "MG", l: "MANAGER", lc: "#E0C074", n: vm.isManager ? "You" : "Manager" },
          vm.captain
            ? { i: vm.captain.initials, l: "CAPTAIN", lc: "#56C98D", n: vm.captain.shortName }
            : { i: "—", l: "CAPTAIN", lc: "#56C98D", n: "Not set" },
        ].map((m) => (
          <div key={m.l} style={{ flex: 1, background: "#111316", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 13, display: "flex", alignItems: "center", gap: 11 }}>
            <Avatar initials={m.i} size={42} fontSize={13} color="#8A8D93" />
            <div>
              <Mono style={{ fontSize: 9.5, color: m.lc, letterSpacing: ".8px", display: "block" }}>{m.l}</Mono>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F3F0", marginTop: 2 }}>{m.n}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {vm.isManager ? (
        <>
          <button
            onClick={() => vm.go("play")}
            style={{ width: "100%", marginTop: 16, borderRadius: 18, background: "linear-gradient(140deg,#1a2b22,#0f1613)", border: "1px solid rgba(86,201,141,.3)", padding: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={22} strokeWidth={2.4} color="#07130D" fill="#07130D" />
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#F4F3F0" }}>Create practice match</div>
                <div style={{ fontSize: 12, color: "#8A9B92", marginTop: 2 }}>Check availability &amp; auto-balance</div>
              </div>
            </div>
            <ChevronRight size={20} strokeWidth={2.2} color="#56C98D" />
          </button>
          <button
            onClick={() => vm.go("members")}
            style={{ width: "100%", marginTop: 10, height: 48, borderRadius: 14, background: "#141619", border: "1px solid rgba(255,255,255,.1)", color: "#F4F3F0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Users size={16} strokeWidth={2} />
            Manage squad &amp; invites
          </button>
        </>
      ) : (
        <>
          <div style={{ width: "100%", marginTop: 16, borderRadius: 18, background: "#111316", border: "1px solid rgba(255,255,255,.08)", padding: 15, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(224,192,116,.12)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Lock size={18} strokeWidth={2} color="#E0C074" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F3F0" }}>Only the manager drafts matches</div>
              <div style={{ fontSize: 12, color: "#8A8D93", marginTop: 2 }}>Set your availability to get picked</div>
            </div>
          </div>
          <button onClick={() => vm.go("play")} style={{ width: "100%", marginTop: 10, height: 50, borderRadius: 14, background: ACCENT, border: "none", color: "#07130D", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Set my availability
          </button>
        </>
      )}

      {/* roster */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 2px 14px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#F4F3F0", letterSpacing: "-.3px" }}>Squad</div>
        <Mono style={{ fontSize: 11, color: "#8A8D93" }}>{vm.players.length} PLAYERS</Mono>
      </div>
      <div className="rondo-roster-grid">
        {vm.players.map((p) => (
          <PlayerCard key={p.id} p={p} showStats={vm.showCardStats} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Vote */
export function VoteScreen({ vm }: { vm: RondoVM }) {
  return (
    <div style={{ minHeight: "100%", padding: "60px 20px 96px" }} className={RISE}>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1.2px", color: "#F4F3F0" }}>Rate teammates</div>
      <div style={{ marginTop: 6, fontSize: 13.5, color: "#8A8D93", lineHeight: 1.4 }}>
        Vote 1–5 stars per skill. Scores settle when the window closes and drive team balancing.
      </div>

      <div style={{ marginTop: 18, background: "#111316", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 15 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#56C98D", boxShadow: "0 0 8px #56C98D" }} />
            <Mono style={{ fontSize: 11, color: "#C9CBCE", letterSpacing: ".5px" }}>VOTING OPEN</Mono>
          </div>
          <Mono style={{ fontSize: 11, color: "#E0C074" }}>CLOSES 2d 04h</Mono>
        </div>
        <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: "#22262b", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, background: ACCENT, width: `${Math.round((vm.ratedCount / vm.totalRatable) * 100)}%` }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#8A8D93" }}>
          You&apos;ve rated <span style={{ color: "#F4F3F0", fontWeight: 700 }}>{vm.ratedCount}</span> of {vm.totalRatable} teammates
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 18 }}>
        {vm.players.map((p) => {
          const voted = vm.rated.includes(p.id);
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 15, background: "#111316", border: "1px solid rgba(255,255,255,.07)" }}>
              <Avatar initials={p.initials} size={40} fontSize={12} color="#C9CBCE" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#F4F3F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <Mono style={{ fontSize: 10.5, color: p.posColor, marginTop: 2, display: "block" }}>{p.pos} · OVR {p.ovr}</Mono>
              </div>
              <button
                onClick={() => vm.setVoteTarget(p.id)}
                style={{
                  padding: "8px 15px",
                  borderRadius: 11,
                  border: `1px solid ${voted ? "rgba(86,201,141,.3)" : "transparent"}`,
                  background: voted ? "rgba(86,201,141,.12)" : ACCENT,
                  color: voted ? "#56C98D" : "#07130D",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {voted ? "Rated ✓" : "Rate"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Play */
export function PlayScreen({ vm }: { vm: RondoVM }) {
  const sizeOptions = [5, 6, 7, 9, 11];
  return (
    <div style={{ minHeight: "100%", padding: "60px 20px 96px" }} className={RISE}>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1.2px", color: "#F4F3F0" }}>Practice match</div>

      {vm.balanced ? (
        <>
          <div style={{ marginTop: 6, fontSize: 13, color: "#8A8D93" }}>
            {vm.teamSize}-a-side · drafted from {vm.availableCount} available players.
          </div>

          {/* balance meter */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, background: "#111316", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#6EA8FF", letterSpacing: "-1px" }}>{vm.homeAvg}</div>
              <Mono style={{ fontSize: 9, color: "#8A8D93", letterSpacing: ".5px", display: "block" }}>HOME AVG</Mono>
            </div>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#6EA8FF,#2b3138 50%,#FF7A6B)", position: "relative" }}>
              <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", width: 3, height: 14, borderRadius: 2, background: "#F4F3F0" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#FF7A6B", letterSpacing: "-1px" }}>{vm.awayAvg}</div>
              <Mono style={{ fontSize: 9, color: "#8A8D93", letterSpacing: ".5px", display: "block" }}>AWAY AVG</Mono>
            </div>
          </div>
          <Mono style={{ textAlign: "center", marginTop: 8, fontSize: 10.5, color: "#56C98D", letterSpacing: ".5px", display: "block" }}>
            ◆ BALANCED — {vm.balanceGap} OVR GAP
          </Mono>

          {/* two teams */}
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            {[
              { label: "HOME", list: vm.home, color: "#9AC3FF", bg: "linear-gradient(160deg,rgba(110,168,255,.09),rgba(10,12,14,.4))", bd: "rgba(110,168,255,.22)" },
              { label: "AWAY", list: vm.away, color: "#FFA99E", bg: "linear-gradient(160deg,rgba(255,122,107,.09),rgba(10,12,14,.4))", bd: "rgba(255,122,107,.22)" },
            ].map((team) => (
              <div key={team.label} style={{ borderRadius: 18, background: team.bg, border: `1px solid ${team.bd}`, padding: "13px 11px" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: team.color, letterSpacing: "-.3px", marginBottom: 11 }}>{team.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {team.list.map((p, idx) => {
                    const sel = vm.swapSel.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => vm.toggleSwap(p.id)}
                        style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 11, background: "#0F1319", border: `1.5px solid ${sel ? "#56C98D" : "rgba(255,255,255,.04)"}`, cursor: "pointer" }}
                      >
                        <Mono style={{ fontSize: 9, fontWeight: 700, color: p.posColor, width: 26 }}>{p.pos}</Mono>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: "#EDECE8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.shortName}
                          {idx === 0 && <span style={{ color: "#56C98D", fontWeight: 900 }}> Ⓒ</span>}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: p.tierAccent }}>{p.ovr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Mono style={{ textAlign: "center", fontSize: 10.5, color: "#63666C", marginTop: 14, display: "block" }}>TAP ONE PLAYER FROM EACH SIDE TO SWAP</Mono>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={vm.doBalance} style={{ flex: 1, height: 50, borderRadius: 14, background: "#141619", border: "1px solid rgba(255,255,255,.1)", color: "#F4F3F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <RefreshCw size={16} strokeWidth={2} />
              Re-draft
            </button>
            <button onClick={() => { vm.setGoals([]); vm.setMotmId(null); vm.go("match"); }} style={{ flex: 1.4, height: 50, borderRadius: 14, background: ACCENT, border: "none", color: "#07130D", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              Start match →
            </button>
          </div>
          <button onClick={() => vm.go("fixtures")} style={{ width: "100%", marginTop: 10, height: 46, borderRadius: 14, background: "none", border: "1px solid rgba(255,255,255,.1)", color: "#C9CBCE", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Schedule for later
          </button>
        </>
      ) : vm.isManager ? (
        <>
          <div style={{ marginTop: 6, fontSize: 13.5, color: "#8A8D93", lineHeight: 1.4, maxWidth: 300 }}>
            Pick your format, check who&apos;s available, then draft two balanced sides.
          </div>

          <Mono style={{ marginTop: 20, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 10, display: "block" }}>TEAM SIZE · PER SIDE</Mono>
          <div style={{ display: "flex", gap: 8 }}>
            {sizeOptions.map((n) => {
              const active = n === vm.teamSize;
              return (
                <button key={n} onClick={() => vm.setTeamSize(n)} style={{ flex: 1, height: 52, borderRadius: 13, background: active ? ACCENT : "#141619", border: active ? "1px solid transparent" : "1px solid rgba(255,255,255,.1)", color: active ? "#07130D" : "#C9CBCE", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>
                  {n}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px" }}>AVAILABILITY</Mono>
            <div style={{ display: "flex", gap: 8 }}>
              <Mono style={{ fontSize: 10, color: "#56C98D" }}>{vm.availableCount} IN</Mono>
              <Mono style={{ fontSize: 10, color: "#E0C074" }}>{vm.maybeCount} MAYBE</Mono>
              <Mono style={{ fontSize: 10, color: "#FF7A6B" }}>{vm.outCount} OUT</Mono>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#111316", border: "1px solid rgba(255,255,255,.08)", borderRadius: 13, padding: "11px 13px", marginBottom: 12 }}>
            <CalendarCheck size={17} strokeWidth={2} color="#56C98D" style={{ flex: "none" }} />
            <span style={{ fontSize: 11.5, color: "#8A9B92", lineHeight: 1.35 }}>Calendar invites + app notifications were sent — players set availability from their phone.</span>
          </div>
          <AvailabilityList vm={vm} />

          <button disabled={vm.drafting} onClick={vm.doBalance} style={{ width: "100%", height: 56, marginTop: 18, border: "none", borderRadius: 16, background: ACCENT, color: "#07130D", fontSize: 15, fontWeight: 800, letterSpacing: "-.2px", cursor: vm.drafting ? "default" : "pointer", opacity: vm.drafting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
            <Zap size={20} strokeWidth={2.4} color="#07130D" fill="#07130D" />
            {vm.drafting ? "Drafting…" : `Draft ${vm.availableCount} available players`}
          </button>
        </>
      ) : (
        <>
          <div style={{ marginTop: 6, fontSize: 13.5, color: "#8A8D93", lineHeight: 1.4, maxWidth: 300 }}>
            Only the manager drafts the sides. Set your availability so you get picked for the next practice match.
          </div>
          <Mono style={{ marginTop: 20, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 10, display: "block" }}>YOUR AVAILABILITY</Mono>
          <AvailabilityList vm={vm} />
        </>
      )}
    </div>
  );
}

function AvailabilityList({ vm }: { vm: RondoVM }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {vm.players.map((p) => {
        const m = AVAIL_META[vm.availOf(p.id)];
        return (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 13, background: "#111316", border: "1px solid rgba(255,255,255,.07)" }}>
            <Avatar initials={p.initials} size={36} fontSize={11} color="#C9CBCE" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F3F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
              <Mono style={{ fontSize: 10, color: p.posColor, marginTop: 1, display: "block" }}>{p.pos} · OVR {p.ovr}</Mono>
            </div>
            <button onClick={() => vm.cycleAvail(p.id)} style={{ padding: "6px 13px", borderRadius: 20, background: m.bg, border: `1px solid ${m.bd}`, color: m.color, fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              {m.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Match */
export function MatchScreen({ vm }: { vm: RondoVM }) {
  const timeline = [...vm.goals].sort((a, b) => a.min - b.min);
  return (
    <div style={{ minHeight: "100%", padding: "56px 20px 96px" }} className={RISE}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <IconChip onClick={() => vm.go("play")} size={38} ariaLabel="Back">
          <ChevronLeft size={17} strokeWidth={2.4} />
        </IconChip>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 20, background: "rgba(255,122,107,.12)", border: "1px solid rgba(255,122,107,.3)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF7A6B", boxShadow: "0 0 8px #FF7A6B" }} />
          <Mono style={{ fontSize: 11, fontWeight: 700, color: "#FFA99E", letterSpacing: ".5px" }}>LIVE {vm.matchMin}&apos;</Mono>
        </div>
      </div>

      {/* scoreboard */}
      <div style={{ marginTop: 18, borderRadius: 22, background: "linear-gradient(160deg,#15181c,#0d0f12)", border: "1px solid rgba(255,255,255,.08)", padding: "22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, margin: "0 auto", borderRadius: 13, background: "rgba(110,168,255,.14)", border: "1px solid rgba(110,168,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#9AC3FF" }}>H</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#F4F3F0", marginTop: 8 }}>HOME</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 52, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-2px" }}>{vm.homeScore}</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: "#4E5157" }}>:</span>
            <span style={{ fontSize: 52, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-2px" }}>{vm.awayScore}</span>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, margin: "0 auto", borderRadius: 13, background: "rgba(255,122,107,.14)", border: "1px solid rgba(255,122,107,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#FFA99E" }}>A</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#F4F3F0", marginTop: 8 }}>AWAY</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => vm.setScorer("home")} style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(110,168,255,.14)", border: "1px solid rgba(110,168,255,.3)", color: "#9AC3FF", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>+ Home goal</button>
          <button onClick={() => vm.setScorer("away")} style={{ flex: 1, height: 44, borderRadius: 12, background: "rgba(255,122,107,.14)", border: "1px solid rgba(255,122,107,.3)", color: "#FFA99E", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>+ Away goal</button>
        </div>
      </div>

      {/* timeline */}
      <Mono style={{ marginTop: 22, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 12, display: "block" }}>MATCH EVENTS</Mono>
      {vm.goals.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {timeline.map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 14, background: "#111316", border: "1px solid rgba(255,255,255,.07)" }}>
              <Mono style={{ width: 40, fontSize: 13, fontWeight: 700, color: g.team === "home" ? "#9AC3FF" : "#FFA99E" }}>{g.min}&apos;</Mono>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#E0C074" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8l2.4 1.7-.9 2.8h-3l-.9-2.8L12 8z" fill="#E0C074" stroke="none" />
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F3F0" }}>{g.name}</div>
                <Mono style={{ fontSize: 10, color: "#8A8D93", marginTop: 1, display: "block" }}>GOAL · {g.team === "home" ? "HOME" : "AWAY"}</Mono>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 26, textAlign: "center", borderRadius: 16, background: "#0F1114", border: "1px dashed rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 13, color: "#8A8D93" }}>No goals yet — tap a goal button above to log one.</div>
        </div>
      )}

      {/* MOTM */}
      <Mono style={{ marginTop: 24, fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 6, display: "block" }}>⭐ MAN OF THE MATCH</Mono>
      <div style={{ fontSize: 12, color: "#8A8D93", marginBottom: 12 }}>Tap a player to award the star.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[...vm.home, ...vm.away].map((p) => {
          const on = vm.motmId === p.id;
          return (
            <button key={p.id} onClick={() => vm.setMotm(p.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderRadius: 12, background: on ? "rgba(231,201,121,.14)" : "#111316", border: `1px solid ${on ? "rgba(231,201,121,.4)" : "rgba(255,255,255,.07)"}`, cursor: "pointer" }}>
              <span style={{ fontSize: 13, color: on ? "#E7C979" : "#3A3F47" }}>★</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#EDECE8" }}>{p.shortName}</span>
            </button>
          );
        })}
      </div>

      <button onClick={() => vm.go("fixtures")} style={{ width: "100%", height: 52, marginTop: 26, borderRadius: 15, background: "#141619", border: "1px solid rgba(255,255,255,.1)", color: "#F4F3F0", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
        End &amp; save result
      </button>
    </div>
  );
}

/* --------------------------------------------------------------- Fixtures */
const TURFS = [
  { id: "cage", name: "The Cage", fmt: "5-a-side · Indoor", dist: "0.8 mi", price: "£48/hr" },
  { id: "astro", name: "Riverside Astro", fmt: "7-a-side · 3G", dist: "1.4 mi", price: "£65/hr" },
  { id: "dome", name: "Central Sports Dome", fmt: "11-a-side · Grass", dist: "3.1 mi", price: "£90/hr" },
];

const DEMO_RESULTS: LiveMatchRow[] = [
  { id: "d1", dateLabel: "05 JUL", score: "4 – 3", color: "#56C98D", venue: "Riverside Astro" },
  { id: "d2", dateLabel: "28 JUN", score: "2 – 2", color: "#C9CBCE", venue: "The Cage" },
];

export function FixturesScreen({ vm }: { vm: RondoVM }) {
  const [scheduling, setScheduling] = React.useState(false);
  const results = vm.liveMatches ?? DEMO_RESULTS;
  return (
    <div style={{ minHeight: "100%", padding: "60px 20px 96px" }} className={RISE}>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1.2px", color: "#F4F3F0" }}>Fixtures</div>

      <div style={{ marginTop: 18, borderRadius: 20, background: "linear-gradient(160deg,#15181c,#0d0f12)", border: "1px solid rgba(255,255,255,.08)", padding: 18 }}>
        <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px", marginBottom: 12, display: "block" }}>SCHEDULE A MATCH</Mono>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { l: "DATE", v: "Sat 12 Jul" },
            { l: "KICK-OFF", v: "18:30" },
          ].map((f) => (
            <div key={f.l} style={{ flex: 1, background: "#0F1114", border: "1px solid rgba(255,255,255,.09)", borderRadius: 13, padding: "12px 14px" }}>
              <Mono style={{ fontSize: 9.5, color: "#8A8D93", letterSpacing: ".5px", display: "block" }}>{f.l}</Mono>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#F4F3F0", marginTop: 3 }}>{f.v}</div>
            </div>
          ))}
        </div>

        <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px", margin: "18px 0 11px", display: "block" }}>SELECT TURF</Mono>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TURFS.map((tf) => {
            const on = vm.turf === tf.id;
            return (
              <button key={tf.id} onClick={() => vm.setTurf(tf.id)} style={{ width: "100%", textAlign: "left", display: "flex", gap: 12, padding: 10, borderRadius: 15, background: "#0F1114", border: `1.5px solid ${on ? "#56C98D" : "rgba(255,255,255,.08)"}`, cursor: "pointer", alignItems: "center" }}>
                <div style={{ width: 64, height: 54, borderRadius: 11, background: "repeating-linear-gradient(45deg,#182a20,#182a20 6px,#14231b 6px,#14231b 12px)", border: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <Mono style={{ fontSize: 8, color: "#5f8a72", letterSpacing: ".5px" }}>TURF</Mono>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#F4F3F0" }}>{tf.name}</div>
                  <Mono style={{ fontSize: 10.5, color: "#8A8D93", marginTop: 3, display: "block" }}>{tf.fmt} · {tf.dist}</Mono>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#E0C074" }}>{tf.price}</div>
                  <div style={{ fontSize: 16, marginTop: 2, color: on ? "#56C98D" : "transparent" }}>✓</div>
                </div>
              </button>
            );
          })}
        </div>
        <button
          disabled={scheduling}
          onClick={async () => {
            if (vm.onSchedule) {
              setScheduling(true);
              const at = new Date(Date.now() + 3 * 86400000).toISOString();
              const tf = TURFS.find((t) => t.id === vm.turf);
              const ok = await vm.onSchedule({
                scheduledAt: at,
                venue: { name: tf ? tf.name : null, address: tf ? tf.fmt : null, booked: false },
              });
              setScheduling(false);
              if (ok) vm.go("play");
            } else {
              vm.go("play");
            }
          }}
          style={{ width: "100%", height: 50, marginTop: 16, border: "none", borderRadius: 14, background: ACCENT, color: "#07130D", fontSize: 14, fontWeight: 800, cursor: scheduling ? "default" : "pointer", opacity: scheduling ? 0.7 : 1 }}
        >
          {scheduling ? "Scheduling…" : "Confirm & notify squad"}
        </button>
      </div>

      <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px", margin: "26px 2px 12px", display: "block" }}>RECENT RESULTS</Mono>
      {results.length === 0 ? (
        <div style={{ padding: 22, textAlign: "center", borderRadius: 15, background: "#0F1114", border: "1px dashed rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 13, color: "#8A8D93" }}>No fixtures yet — schedule one above.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {results.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 13, borderRadius: 15, background: "#111316", border: "1px solid rgba(255,255,255,.07)" }}>
              <Mono style={{ fontSize: 10, color: "#8A8D93", width: 52 }}>{r.dateLabel}</Mono>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#F4F3F0" }}>Home <span style={{ color: "#8A8D93" }}>vs</span> Away</div>
                {r.venue && <Mono style={{ fontSize: 9.5, color: "#8A8D93", marginTop: 2, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.venue}</Mono>}
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: r.color }}>{r.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Members */
const PENDING = [
  { id: "inv1", name: "Chris Boateng", initials: "CB", via: "CODE · RON-4F2" },
  { id: "inv2", name: "Pavel Novak", initials: "PN", via: "LINK · rondo.app/j" },
];

const ADD_POSITIONS = ["GK", "DEF", "MID", "FWD", "ALL"] as const;

export function MembersScreen({ vm }: { vm: RondoVM }) {
  const [addName, setAddName] = React.useState("");
  const [addPos, setAddPos] = React.useState<(typeof ADD_POSITIONS)[number]>("MID");
  const [addEmail, setAddEmail] = React.useState("");
  const canAdd = addName.trim().length > 0;
  const submitAdd = () => {
    if (!canAdd) return;
    vm.addPlayer({ name: addName.trim(), position: addPos, email: addEmail.trim() || null });
    setAddName("");
    setAddEmail("");
    setAddPos("MID");
  };
  const rosterMembers = vm.players
    .filter((p) => !vm.membersRemoved.includes(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      role: p.isCaptain ? "Captain" : "Player",
      roleColor: p.isCaptain ? "#56C98D" : "#9A9DA3",
      pos: p.pos,
      posColor: p.posColor,
      isCaptain: !!p.isCaptain,
      manager: false,
    }));
  const membersList = [
    { id: "mgr", name: "Manager", initials: "MG", role: "Manager", roleColor: "#E0C074", pos: "MGR", posColor: "#E0C074", isCaptain: false, manager: true },
    ...rosterMembers,
  ];
  const pendingSource = vm.joinRequests
    ? vm.joinRequests.map((jr) => ({ id: jr.id, name: jr.name, initials: (jr.name.trim()[0] ?? "?").toUpperCase(), via: jr.via }))
    : PENDING;
  const pendingCount = pendingSource.filter((iv) => !vm.invitesResolved[iv.id]).length;

  return (
    <div style={{ minHeight: "100%", padding: "60px 20px 40px" }} className={RISE}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconChip onClick={() => vm.go("squad")} ariaLabel="Back">
          <ChevronLeft size={18} strokeWidth={2.4} />
        </IconChip>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-1px", color: "#F4F3F0" }}>Manage squad</div>
          <Mono style={{ fontSize: 10.5, color: "#8A8D93", marginTop: 2, display: "block" }}>{membersList.length} MEMBERS</Mono>
        </div>
      </div>

      {vm.isManager && (
        <>
          <div style={{ marginTop: 20, borderRadius: 18, background: "linear-gradient(160deg,#15211b,#0e1512)", border: "1px solid rgba(86,201,141,.22)", padding: 16 }}>
            <Mono style={{ fontSize: 11, color: "#8A9B92", letterSpacing: "1px", marginBottom: 12, display: "block" }}>INVITE PLAYERS</Mono>
            <div style={{ display: "flex", gap: 9 }}>
              <div style={{ flex: 1, background: "#0C110E", border: "1px dashed rgba(86,201,141,.35)", borderRadius: 12, padding: "11px 13px" }}>
                <Mono style={{ fontSize: 9, color: "#8A9B92", letterSpacing: ".5px", display: "block" }}>INVITE CODE</Mono>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#56C98D", letterSpacing: "1px", marginTop: 2 }}>{vm.joinCode ?? "RON-4F2"}</div>
              </div>
              <button onClick={() => { if (vm.joinCode && typeof navigator !== "undefined" && navigator.clipboard) void navigator.clipboard.writeText(vm.joinCode); }} style={{ width: 52, borderRadius: 12, background: "#56C98D", border: "none", color: "#07130D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Copy code">
                <Copy size={18} strokeWidth={2} />
              </button>
            </div>
            <Mono style={{ fontSize: 9, color: "#8A9B92", letterSpacing: ".5px", margin: "14px 0 8px", display: "block" }}>ADD A PLAYER</Mono>
            <div style={{ display: "flex", gap: 9 }}>
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAdd()}
                placeholder="Player name"
                style={{ flex: 1, height: 44, borderRadius: 12, background: "#0C110E", border: "1px solid rgba(255,255,255,.08)", color: "#F4F3F0", padding: "0 13px", fontSize: 12.5, outline: "none" }}
              />
              <select
                value={addPos}
                onChange={(e) => setAddPos(e.target.value as (typeof ADD_POSITIONS)[number])}
                aria-label="Position"
                style={{ width: 80, height: 44, borderRadius: 12, background: "#0C110E", border: "1px solid rgba(255,255,255,.08)", color: "#F4F3F0", padding: "0 8px", fontSize: 12.5, outline: "none" }}
              >
                {ADD_POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
              <input
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitAdd()}
                placeholder="Email for RSVP (optional)"
                type="email"
                style={{ flex: 1, height: 44, borderRadius: 12, background: "#0C110E", border: "1px solid rgba(255,255,255,.08)", color: "#F4F3F0", padding: "0 13px", fontSize: 12.5, outline: "none" }}
              />
              <button onClick={submitAdd} disabled={!canAdd} style={{ padding: "0 18px", borderRadius: 12, background: canAdd ? "#56C98D" : "#141619", border: canAdd ? "none" : "1px solid rgba(255,255,255,.12)", color: canAdd ? "#07130D" : "#63666C", fontSize: 12.5, fontWeight: 800, cursor: canAdd ? "pointer" : "default" }}>Add</button>
            </div>
            <button style={{ width: "100%", height: 44, marginTop: 9, borderRadius: 12, background: "none", border: "1px solid rgba(86,201,141,.3)", color: "#56C98D", fontSize: 12.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <Upload size={15} strokeWidth={2} />
              Share invite link
            </button>
          </div>

          {pendingCount > 0 && (
            <>
              <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px", margin: "22px 2px 11px", display: "block" }}>PENDING REQUESTS · {pendingCount}</Mono>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {pendingSource.map((iv) => {
                  const st = vm.invitesResolved[iv.id];
                  return (
                    <div key={iv.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 14, background: "#111316", border: "1px solid rgba(255,255,255,.07)" }}>
                      <Avatar initials={iv.initials} size={38} fontSize={11} color="#C9CBCE" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F3F0" }}>{iv.name}</div>
                        <Mono style={{ fontSize: 9.5, color: "#8A8D93", marginTop: 1, display: "block" }}>{iv.via}</Mono>
                      </div>
                      {st ? (
                        <span style={{ fontSize: 12, fontWeight: 800, color: st === "accepted" ? "#56C98D" : "#8A8D93" }}>{st === "accepted" ? "Added" : "Declined"}</span>
                      ) : (
                        <div style={{ display: "flex", gap: 7 }}>
                          <button onClick={() => vm.declineJoin(iv.id)} style={{ width: 34, height: 34, borderRadius: 10, background: "#1C1F23", border: "1px solid rgba(255,255,255,.08)", color: "#FF7A6B", cursor: "pointer", fontSize: 15 }}>✕</button>
                          <button onClick={() => vm.approveJoin(iv.id)} style={{ width: 34, height: 34, borderRadius: 10, background: "#56C98D", border: "none", color: "#07130D", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={16} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px", margin: "22px 2px 11px", display: "block" }}>MEMBERS &amp; ROLES</Mono>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {membersList.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 13, background: "#111316", border: "1px solid rgba(255,255,255,.07)" }}>
            <Avatar initials={m.initials} size={38} fontSize={11} color="#C9CBCE" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4F3F0" }}>{m.name}</div>
              <Mono style={{ fontSize: 9.5, color: m.roleColor, marginTop: 1, letterSpacing: ".5px", display: "block" }}>{m.role}</Mono>
            </div>
            <Mono style={{ fontSize: 10, color: m.posColor }}>{m.pos}</Mono>
            {vm.isManager && !m.manager && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => vm.makeCaptain(m.id)}
                  disabled={m.isCaptain}
                  title={m.isCaptain ? "Captain" : "Make captain"}
                  aria-label={m.isCaptain ? "Captain" : `Make ${m.name} captain`}
                  style={{ width: 32, height: 32, borderRadius: 9, background: m.isCaptain ? "rgba(86,201,141,.14)" : "#1C1F23", border: `1px solid ${m.isCaptain ? "rgba(86,201,141,.4)" : "rgba(255,255,255,.06)"}`, color: m.isCaptain ? "#56C98D" : "#8A8D93", cursor: m.isCaptain ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900 }}
                >
                  Ⓒ
                </button>
                <button onClick={() => vm.releasePlayer(m.id)} style={{ width: 32, height: 32, borderRadius: 9, background: "#1C1F23", border: "1px solid rgba(255,255,255,.06)", color: "#8A8D93", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label={`Remove ${m.name}`}>
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Community */
const LEADERBOARD = [
  { rank: 1, name: "East End Rovers", pts: 2410, me: false },
  { rank: 2, name: "Marsh Lane FC", pts: 2180, me: false },
  { rank: 4, name: "Northside FC", pts: 1840, me: true },
  { rank: 5, name: "Dockside AFC", pts: 1720, me: false },
];
const FEED = [
  { id: "f1", team: "Northside FC", crest: "N", crestBg: "rgba(86,201,141,.14)", crestColor: "#56C98D", when: "2h", title: "Home 4 – 3 Away", body: "Marco Silva bags a hat-trick. Winning streak extended to three.", tag: "+24 PTS", tagBg: "rgba(86,201,141,.14)", tagColor: "#56C98D", validated: true, star: "M. Silva" },
  { id: "f2", team: "Rondo", crest: "R", crestBg: "#1E2228", crestColor: "#F4F3F0", when: "5h", title: "Public friendlies are coming", body: "Soon you can make your squad public and challenge other teams — winners take a cut of the rival team points.", tag: "SOON", tagBg: "rgba(224,192,116,.14)", tagColor: "#E0C074", validated: false, star: null },
  { id: "f3", team: "Vets United", crest: "V", crestBg: "rgba(224,192,116,.14)", crestColor: "#E0C074", when: "1d", title: "Home 2 – 2 Away", body: "Honours even at Riverside Astro. Points shared between sides.", tag: "+8 PTS", tagBg: "rgba(255,255,255,.06)", tagColor: "#9A9DA3", validated: true, star: "A. Pirlo" },
];

export function CommunityScreen({ vm }: { vm: RondoVM }) {
  void vm;
  return (
    <div style={{ minHeight: "100%", padding: "60px 20px 96px" }} className={RISE}>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-1.2px", color: "#F4F3F0" }}>Community</div>
      <div style={{ marginTop: 6, fontSize: 13.5, color: "#8A8D93" }}>Results, news and where your squad ranks.</div>

      <div className="rondo-two-col" style={{ marginTop: 18 }}>
      <div>
      <div style={{ borderRadius: 18, background: "linear-gradient(160deg,#15181c,#0d0f12)", border: "1px solid rgba(255,255,255,.08)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px" }}>LOCAL LEADERBOARD</Mono>
          <Mono style={{ fontSize: 10, color: "#E0C074" }}>SEASON 26</Mono>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {LEADERBOARD.map((r) => (
            <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 12, background: r.me ? "rgba(86,201,141,.1)" : "#111316", border: `1px solid ${r.me ? "rgba(86,201,141,.3)" : "rgba(255,255,255,.07)"}` }}>
              <Mono style={{ fontSize: 13, fontWeight: 700, color: "#8A8D93", width: 22 }}>{r.rank}</Mono>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: r.me ? "#56C98D" : "#F4F3F0" }}>{r.name}</span>
              <Mono style={{ fontSize: 12, fontWeight: 700, color: "#F4F3F0" }}>{r.pts}</Mono>
            </div>
          ))}
        </div>
      </div>
      </div>

      <div>
      <Mono style={{ fontSize: 11, color: "#63666C", letterSpacing: "1px", margin: "0 2px 12px", display: "block" }}>LATEST</Mono>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FEED.map((f) => (
          <div key={f.id} style={{ borderRadius: 16, background: "#111316", border: "1px solid rgba(255,255,255,.07)", padding: "14px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: f.crestBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: f.crestColor }}>{f.crest}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F4F3F0" }}>{f.team}</div>
                <Mono style={{ fontSize: 9.5, color: "#8A8D93", marginTop: 1, display: "block" }}>{f.when} AGO</Mono>
              </div>
              <Mono style={{ fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 20, background: f.tagBg, color: f.tagColor }}>{f.tag}</Mono>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#F4F3F0", letterSpacing: "-.4px", marginTop: 12 }}>{f.title}</div>
            <div style={{ fontSize: 12.5, color: "#9A9DA3", lineHeight: 1.45, marginTop: 5 }}>{f.body}</div>
            {(f.validated || f.star) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                {f.validated && (
                  <Mono style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "#56C98D", letterSpacing: ".5px" }}>
                    <Check size={13} strokeWidth={2.4} /> VALIDATED BY TURF
                  </Mono>
                )}
                {f.star && <Mono style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "#E0C074", letterSpacing: ".5px" }}>★ MOTM {f.star}</Mono>}
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}
