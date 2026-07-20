/*
 * PProfile — the player's v5 "night-pitch" Profile screen (design-reference
 * lines 1063-1095, spec §2 player screen 9): identity card (dark avatar, OVR
 * figure), YOUR SCORE (read-only segments "from teammate votes"),
 * notifications toggle, switch team and sign out. Identity comes from the
 * viewer's own claimed roster player (`vm.myPlayerId` → `vm.byId`), same
 * lookup `PHome`'s header avatar uses.
 *
 * `RondoVM` has no sign-out action (a session/auth concern the core package
 * doesn't own) — `onSignOut` is host-managed, same convention `MProfile`
 * takes `onInvite`/`onSignOut` extra props for its own host-only affordances.
 *
 * The score segments are a visual proportion of the player's 1-99 skill
 * value onto the 5-block bar (`segFill`) — the same 5-segment primitive
 * `PRate`'s 1-5 star votes use, just fed a different underlying scale.
 */
"use client";

import * as React from "react";
import { initials, type RondoVM } from "@saas/rondo-core";
import { C5, ChipTag, Icon, ink, MONO, MonoLabel, SegmentBar, Toggle } from "./kit5";
import { enableNotifications, notifyState, type NotifyState } from "../notifications";
import { POSITION_LABEL } from "./p-home";

/** 1-99 skill value → 0-5 segment fill (see file header). */
function segFill(v: number, max = 99): number {
  return Math.max(0, Math.min(5, Math.round((v / max) * 5)));
}

export function PProfile({
  vm,
  nav,
  toast,
  onSignOut,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  onSignOut: () => void;
}) {
  const [notif, setNotif] = React.useState<NotifyState>("default");
  React.useEffect(() => {
    setNotif(notifyState());
  }, []);

  const me = vm.myPlayerId ? vm.byId(vm.myPlayerId) : undefined;
  const name = me?.name ?? vm.activeTeamName;
  const myInitials = me?.initials ?? initials(vm.activeTeamName);
  const myOvr = me?.ovr ?? 0;
  const myPosLabel = me ? POSITION_LABEL[me.pos] : null;
  const skills = me ? Object.entries(me.skills) : [];

  function toggleNotifications() {
    if (notif === "granted") {
      toast("Notifications are already on — manage them in your browser settings");
      return;
    }
    void enableNotifications().then(setNotif);
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <div
          onClick={() => nav("home")}
          style={{ width: 38, height: 38, borderRadius: 12, background: C5.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C5.ink, cursor: "pointer" }}
        >
          <Icon name="back" size={16} color={C5.ink} stroke={2.4} />
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>Your profile</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 20px" }}>
        <div style={{ borderRadius: 20, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 20, display: "flex", alignItems: "center", gap: 15 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C5.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C5.surface, flex: "none" }}>
            {myInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            {myPosLabel && (
              <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
                <ChipTag bg="rgba(30,138,94,.12)" fg={C5.green} size={8.5}>
                  {myPosLabel}
                </ChipTag>
              </div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1.5, color: C5.green, lineHeight: 1 }}>{myOvr}</div>
            <MonoLabel size={7.5} tone={0.45} style={{ marginTop: 2, letterSpacing: 1 }}>
              OVR
            </MonoLabel>
          </div>
        </div>

        <MonoLabel size={9.5} style={{ marginTop: 14 }}>YOUR SCORE · FROM TEAMMATE VOTES</MonoLabel>
        <div style={{ marginTop: 8, borderRadius: 18, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {skills.map(([k, v]) => (
            <div key={k}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 600, color: ink(0.55) }}>{k}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C5.ink }}>{v}</span>
              </div>
              <SegmentBar value={segFill(v)} size={16} />
            </div>
          ))}
          {skills.length === 0 && <span style={{ fontSize: 12, color: ink(0.5) }}>No score yet — play a match to get rated.</span>}
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ borderRadius: 14, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C5.ink }}>Notifications</span>
            <Toggle on={notif === "granted"} {...(notif === "unsupported" ? {} : { onClick: toggleNotifications })} />
          </div>

          <div
            onClick={() => nav("hub")}
            style={{ borderRadius: 14, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C5.ink }}>Switch team</span>
            <span style={{ fontSize: 13, color: ink(0.35) }}>›</span>
          </div>

          <div
            onClick={onSignOut}
            style={{ borderRadius: 14, background: C5.card, border: "1px solid rgba(176,81,47,.3)", padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <Icon name="logout" size={15} color={C5.rust} />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C5.rust }}>Sign out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
