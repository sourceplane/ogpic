/*
 * /rondo/start — the first-run fork for a signed-in user with no squad yet:
 * create a team (become manager) or join one with a code (as a player). Either
 * path stays reachable later, so this is a fork, not a commitment. Rebuilt on
 * the v5 night-pitch kit so it matches the rest of the app (no more old-kit
 * "different page" jump).
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import "../../../styles/rondo-kit.css";
import { useRequireAuth } from "@/lib/use-async";
import { C5, ink, Icon, MONO } from "@/components/rondo/v5/kit5";
import { Pressable } from "@/components/rondo/v5/anim5";

export default function RondoStartPage() {
  const router = useRouter();
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <div style={{ minHeight: "100dvh", background: C5.surface, maxWidth: 430, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "max(env(safe-area-inset-top),22px) 24px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: ink(0.45) }}>WELCOME TO RONDO</div>
        <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, letterSpacing: -0.9, color: C5.ink, lineHeight: 1.12 }}>
          How do you want
          <br />
          to start?
        </div>
        <div style={{ marginTop: 8, fontSize: 13.5, color: ink(0.55) }}>You can always do both later.</div>

        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* create — manager */}
          <Pressable
            onClick={() => router.push("/rondo/new")}
            style={{ borderRadius: 22, background: C5.green, padding: "22px 20px", color: C5.surface, position: "relative", overflow: "hidden", cursor: "pointer" }}
          >
            <div style={{ position: "absolute", right: -40, top: -40, width: 140, height: 140, border: "2px solid rgba(245,242,233,.16)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", right: 4, top: 4, width: 66, height: 66, border: "2px solid rgba(245,242,233,.12)", borderRadius: "50%" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(245,242,233,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="plus" size={18} color={C5.surface} stroke={2.4} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, padding: "4px 9px", borderRadius: 9, background: "rgba(245,242,233,.16)" }}>
                YOU&rsquo;LL BE THE MANAGER
              </span>
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, marginTop: 14 }}>Create a team</div>
            <div style={{ fontSize: 12.5, color: "rgba(245,242,233,.78)", lineHeight: 1.45, marginTop: 6, maxWidth: 260 }}>
              Name your club, set the format, invite players. You schedule matches and draft the sides.
            </div>
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", borderRadius: 20, background: C5.surface, color: C5.ink, fontSize: 13, fontWeight: 700 }}>
              Set up my club →
            </div>
          </Pressable>

          {/* join — player */}
          <Pressable
            onClick={() => router.push("/rondo/join")}
            style={{ borderRadius: 22, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: "22px 20px", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(30,138,94,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="link" size={17} color={C5.green} stroke={2.2} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, padding: "4px 9px", borderRadius: 9, background: ink(0.06), color: ink(0.6) }}>
                YOU&rsquo;LL JOIN AS A PLAYER
              </span>
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.4, marginTop: 14, color: C5.ink }}>Join with a code</div>
            <div style={{ fontSize: 12.5, color: ink(0.55), lineHeight: 1.45, marginTop: 6, maxWidth: 260 }}>
              Got an invite from your captain? Enter the code and you&rsquo;re on the pitch.
            </div>
            <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", borderRadius: 20, border: `1.5px solid ${C5.ink}`, color: C5.ink, fontSize: 13, fontWeight: 700 }}>
              Enter code →
            </div>
          </Pressable>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ paddingTop: 20, textAlign: "center", fontFamily: MONO, fontSize: 9.5, color: ink(0.4) }}>
          YOU CAN BE IN SEVERAL SQUADS AT ONCE
        </div>
      </div>
    </div>
  );
}
