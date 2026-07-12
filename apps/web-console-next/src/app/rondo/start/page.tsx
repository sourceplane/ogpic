/*
 * /rondo/start — the role picker (canvas 2a "START"). After sign-in a user with
 * no squad lands here and chooses: create a team (become the manager) or join
 * one with a code (as a player). Either path is reachable later, so this is a
 * fork, not a commitment. Pitchside v2.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo-kit.css";
import { useRequireAuth } from "@/lib/use-async";
import { C, ink, PhoneShell, StatusBar } from "@/components/rondo/kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export default function RondoStartPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <PhoneShell>
      <StatusBar />
      <div style={{ padding: "22px 26px 0" }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.8, color: C.ink, lineHeight: 1.15 }}>
          How do you want
          <br />
          to start?
        </div>
        <div style={{ marginTop: 8, fontSize: 13.5, color: ink(0.55) }}>You can always do both later.</div>
      </div>

      <div style={{ padding: "26px 24px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* create — manager */}
        <div
          onClick={() => router.push("/rondo/new")}
          className="rk-press"
          style={{ borderRadius: 22, background: C.green, padding: "24px 22px", color: C.onDark, position: "relative", overflow: "hidden" }}
        >
          <div style={{ position: "absolute", right: -40, top: -40, width: 140, height: 140, border: "2px solid rgba(242,244,241,.18)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", right: 0, top: 0, width: 70, height: 70, border: "2px solid rgba(242,244,241,.14)", borderRadius: "50%" }} />
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, padding: "4px 9px", borderRadius: 10, background: "rgba(242,244,241,.16)" }}>
            YOU&rsquo;LL BE THE MANAGER
          </span>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, marginTop: 14 }}>Create a team</div>
          <div style={{ fontSize: 12.5, color: "rgba(242,244,241,.75)", lineHeight: 1.45, marginTop: 6, maxWidth: 250 }}>
            Name your club, set the format, invite players. You schedule matches and draft the sides.
          </div>
          <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", borderRadius: 20, background: C.surface, color: C.ink, fontSize: 13, fontWeight: 700 }}>
            Set up my club →
          </div>
        </div>

        {/* join — player */}
        <div
          onClick={() => router.push("/rondo/join")}
          className="rk-press"
          style={{ borderRadius: 22, background: C.card, border: `1px solid ${ink(0.12)}`, padding: "24px 22px" }}
        >
          <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, padding: "4px 9px", borderRadius: 10, background: ink(0.07), color: ink(0.6) }}>
            YOU&rsquo;LL JOIN AS A PLAYER
          </span>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, marginTop: 14, color: C.ink }}>Join with a code</div>
          <div style={{ fontSize: 12.5, color: ink(0.55), lineHeight: 1.45, marginTop: 6, maxWidth: 250 }}>
            Got an invite from your captain? Enter the code and you&rsquo;re on the pitch.
          </div>
          <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", borderRadius: 20, border: `1.5px solid ${C.ink}`, color: C.ink, fontSize: 13, fontWeight: 700 }}>
            Enter code →
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: "0 24px 30px", textAlign: "center", fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>
        YOU CAN BE IN SEVERAL SQUADS AT ONCE
      </div>
    </PhoneShell>
  );
}
