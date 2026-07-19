/*
 * PRate — the player's v5 "night-pitch" rate-a-teammate screen (design-
 * reference lines 1021-1061, spec §2 player screen 8): closed state (lock,
 * explanation) when `!vm.votingOpen`; open state drives the same unrated
 * queue `views.tsx`'s v4 `RateView` does (`vm.rated`/`vm.voteTargetP`/
 * `vm.setVoteTarget`) — a teammate card (identity, OVR chip) + 6 position-
 * specific `SegmentBar`s (`vm.voteSkills`, `vm.setVote`) + `Save & next →`
 * (`vm.submitVote`, which persists and advances the queue itself).
 */
"use client";

import * as React from "react";
import type { RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, SegmentBar } from "./kit5";

export function PRate({ vm, toast }: { vm: RondoVM; nav: (screen: string) => void; toast: (msg: string) => void }) {
  const ratedSet = new Set(vm.rated);
  const queue = vm.players.filter((p) => !ratedSet.has(p.id));
  React.useEffect(() => {
    if (!vm.voteTargetP && queue[0]) vm.setVoteTarget(queue[0].id);
  }, [vm.voteTargetP, queue.length]);

  const t = vm.voteTargetP;
  const open = vm.votingOpen;

  function saveAndNext() {
    vm.submitVote();
    toast("Saved — next teammate");
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flex: "none" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6, color: C5.ink }}>Rate</span>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: C5.green }}>
          {vm.ratedCount} / {vm.totalRatable} RATED
        </span>
      </div>

      {!open && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: C5.card, border: `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", justifyContent: "center", color: ink(0.4) }}>
            <Icon name="lock" size={28} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C5.ink, marginTop: 18 }}>Voting is closed</div>
          <div style={{ fontSize: 12.5, color: ink(0.55), lineHeight: 1.5, marginTop: 8 }}>
            A manager opens the rating window &mdash; usually after a match. You&rsquo;ll get a notification.
          </div>
        </div>
      )}

      {open && !t && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
          <span style={{ fontSize: 14, color: ink(0.5) }}>You&rsquo;ve rated everyone &mdash; thanks!</span>
        </div>
      )}

      {open && t && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, margin: "14px 20px 0", background: C5.card, border: `1px solid ${ink(0.1)}`, borderRadius: 22, padding: 20, display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#E5E3D2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C5.ink, flex: "none" }}>
                {t.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.5), marginTop: 2 }}>{t.pos} · ANONYMOUS</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, padding: "5px 10px", borderRadius: 12, background: "rgba(30,138,94,.1)", color: C5.green }}>OVR {t.ovr}</span>
            </div>

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 15 }}>
              {vm.voteSkills.map((sk) => (
                <div key={sk}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.55) }}>{sk}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C5.ink }}>{t.myStars[sk] ?? 0}</span>
                  </div>
                  <SegmentBar value={t.myStars[sk] ?? 0} onChange={(n) => vm.setVote(sk, n)} />
                </div>
              ))}
            </div>

            <div style={{ flex: 1, minHeight: 14 }} />
            <div
              onClick={saveAndNext}
              style={{ height: 50, borderRadius: 15, background: C5.ink, color: C5.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700, cursor: "pointer", flex: "none" }}
            >
              Save &amp; next →
            </div>
          </div>
          <div style={{ height: 14, flex: "none" }} />
        </div>
      )}
    </div>
  );
}
