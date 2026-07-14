/*
 * Shared VM-driven screens used by both the manager and player surfaces so every
 * bottom-nav tab is reachable from either role: RateView (the voting flow) and
 * GamesView (fixtures + results). Each takes the nav element to render, so the
 * caller supplies its own (manager 5-tab vs player 3-tab).
 */
"use client";

import * as React from "react";
import type { RondoVM } from "./use-rondo";
import { C, ink, green, rust, PhoneShell, StatusBar, ScreenBody, MonoLabel, Avatar, RatingSegments, MapCard } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

/** Rate — one player at a time, position-specific skill scales, driven by the
 * VM's voting flow. Advances through the unrated queue on submit. */
export function RateView({ vm, nav }: { vm: RondoVM; nav: React.ReactNode }) {
  const ratedSet = new Set(vm.rated);
  const queue = vm.players.filter((p) => !ratedSet.has(p.id));
  React.useEffect(() => {
    if (!vm.voteTargetP && queue[0]) vm.setVoteTarget(queue[0].id);
  }, [vm.voteTargetP, queue.length]);

  const t = vm.voteTargetP;
  return (
    <PhoneShell>
      <StatusBar />
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>Rate</span>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C.green }}>
          {String(vm.ratedCount).padStart(2, "0")} / {vm.totalRatable}
        </span>
      </div>
      <div style={{ padding: "6px 24px 0", fontSize: 12, color: ink(0.5) }}>Anonymous · settles when the window closes</div>
      {t ? (
        <div style={{ flex: 1, margin: "16px 20px 24px", background: C.card, border: `1px solid ${ink(0.1)}`, borderRadius: 22, padding: "26px 22px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar initials={t.initials} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, color: C.ink }}>{t.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: ink(0.5), marginTop: 2 }}>{t.pos} · OVR {t.ovr}</div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
            {vm.voteSkills.map((sk) => (
              <RatingSegments key={sk} label={sk} value={t.myStars[sk] ?? 0} onChange={(n) => vm.setVote(sk, n)} />
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div onClick={() => vm.submitVote()} className="rk-press" style={{ height: 54, borderRadius: 16, background: C.ink, color: C.onDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
            Submit &amp; next →
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", color: ink(0.5), fontSize: 14 }}>
          You&rsquo;ve rated everyone — thanks!
        </div>
      )}
      {nav}
    </PhoneShell>
  );
}

/** Games — next fixture + results, from the VM's live matches. Players see a
 * "only your manager schedules" note; managers don't. */
export function GamesView({ vm, nav, managerNote = true }: { vm: RondoVM; nav: React.ReactNode; managerNote?: boolean }) {
  const matches = vm.liveMatches ?? [];
  const next = matches[0] ?? null;
  return (
    <PhoneShell>
      <StatusBar />
      <div style={{ padding: "12px 24px 0" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>Games</span>
      </div>
      <ScreenBody style={{ padding: "16px 24px 0" }}>
        <MonoLabel>NEXT UP</MonoLabel>
        {next ? (
          <div style={{ marginTop: 10, borderRadius: 20, background: C.card, border: `1px solid ${ink(0.12)}`, overflow: "hidden" }}>
            <MapCard height={120} style={{ borderRadius: 0, border: "none" }} />
            <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 58, flex: "none", textAlign: "center", borderRight: `1px solid ${ink(0.1)}`, paddingRight: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>{next.dateLabel}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, color: C.ink }}>{next.venue ?? "Venue TBC"}</div>
                {next.mapsUrl && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: C.green }}>Directions ↗</div>}
              </div>
              <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, padding: "6px 10px", borderRadius: 12, background: green(0.12), color: C.green, flex: "none" }}>{vm.availableCount} IN</span>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 10, borderRadius: 16, border: `1px dashed ${ink(0.2)}`, padding: "18px 16px", fontSize: 12.5, color: ink(0.5), textAlign: "center" }}>No match scheduled yet</div>
        )}

        <div style={{ marginTop: 24 }}>
          <MonoLabel>RESULTS</MonoLabel>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {matches.slice(1).map((g) => (
              <div key={g.id} style={{ borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 13 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.45), width: 46 }}>{g.dateLabel}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink }}>{g.venue ?? "Match"}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{g.score}</span>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: g.color === "#17694A" ? green(0.14) : g.color === "#B0512F" ? rust(0.14) : ink(0.08), color: g.color, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {g.color === "#17694A" ? "W" : g.color === "#B0512F" ? "L" : g.score === "—" ? "·" : "D"}
                </span>
              </div>
            ))}
            {matches.length <= 1 && <div style={{ padding: 8, textAlign: "center", fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>NO RESULTS YET</div>}
          </div>
          {managerNote && (
            <div style={{ marginTop: 14, borderRadius: 14, border: `1px dashed ${ink(0.2)}`, padding: "12px 16px", fontSize: 11.5, color: ink(0.5), textAlign: "center" }}>Only your manager can schedule matches</div>
          )}
        </div>
      </ScreenBody>
      {nav}
    </PhoneShell>
  );
}
