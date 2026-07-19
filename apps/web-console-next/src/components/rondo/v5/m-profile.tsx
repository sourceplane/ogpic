/*
 * MProfile — the manager's v5 "night-pitch" Profile screen (design-reference
 * lines 586-606, spec §2 screen 11): identity card (gold ring, MANAGER chip,
 * email), Club settings / Invite code / Notifications rows, Switch team and
 * Sign out. Identity comes from the viewer's own claimed roster player
 * (`vm.myPlayerId` → `vm.byId`), the same lookup `MHome`'s header avatar
 * already relies on.
 *
 * `RondoVM` has no sign-out action (that's a session/auth concern the core
 * package doesn't own) and no invite-flow trigger (same reason `MHome` takes
 * `onInvite` rather than driving its own sheet) — both are host-managed via
 * the `onInvite`/`onSignOut` extra props. Club settings is one of the
 * spec §8 stubs — a toast, matching the design's own "(coming soon)" tiles.
 */
"use client";

import * as React from "react";
import { initials, type RondoVM } from "@saas/rondo-core";
import { C5, Icon, ink, MONO, Toggle } from "./kit5";
import { enableNotifications, notifyState, type NotifyState } from "../notifications";

export function MProfile({
  vm,
  nav,
  toast,
  onInvite,
  onSignOut,
}: {
  vm: RondoVM;
  nav: (screen: string) => void;
  toast: (msg: string) => void;
  onInvite: () => void;
  onSignOut: () => void;
}) {
  const [notif, setNotif] = React.useState<NotifyState>("default");
  React.useEffect(() => {
    setNotif(notifyState());
  }, []);

  const me = vm.myPlayerId ? vm.byId(vm.myPlayerId) : undefined;
  const name = me?.name ?? vm.activeTeamName;
  const myInitials = me?.initials ?? initials(vm.activeTeamName);
  const email = me?.email ?? null;

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
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: C5.card,
            border: `1px solid ${ink(0.14)}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C5.ink,
            cursor: "pointer",
          }}
        >
          <Icon name="back" size={16} color={C5.ink} stroke={2.4} />
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C5.ink }}>Profile</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 24px 20px" }}>
        <div style={{ borderRadius: 20, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 20, display: "flex", alignItems: "center", gap: 15 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#E5E3D2",
              border: `3px solid ${C5.gold}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: C5.ink,
              flex: "none",
            }}
          >
            {myInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {vm.isManager && (
                <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, padding: "4px 9px", borderRadius: 10, background: C5.goldBg, color: C5.goldText }}>
                  MANAGER
                </span>
              )}
              <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, padding: "4px 9px", borderRadius: 10, background: ink(0.06), color: ink(0.55) }}>
                {email ?? "—"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
          <div
            onClick={() => toast("Club settings — coming soon")}
            style={{ borderRadius: 14, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C5.ink }}>Club settings</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: ink(0.4) }}>NAME · CREST · 6v6</span>
            <span style={{ fontSize: 13, color: ink(0.35) }}>›</span>
          </div>

          <div
            onClick={onInvite}
            style={{ borderRadius: 14, background: C5.card, border: `1px solid ${ink(0.1)}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C5.ink }}>Invite code &amp; link</span>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C5.green }}>{vm.joinCode ?? "—"}</span>
            <span style={{ fontSize: 13, color: ink(0.35) }}>›</span>
          </div>

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
            style={{
              borderRadius: 14,
              background: C5.card,
              border: "1px solid rgba(176,81,47,.3)",
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <Icon name="logout" size={15} color={C5.rust} />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C5.rust }}>Sign out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
