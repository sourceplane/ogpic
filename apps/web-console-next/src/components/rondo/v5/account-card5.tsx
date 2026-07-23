/*
 * AccountCard5 — the signed-in user's account panel for the v5 "Your teams"
 * hub (Hub5). Surfaces the profile photo (initials avatar), name + email, the
 * account-level settings that apply before you're inside a squad
 * (notifications), and Sign out. Self-contained: it owns its own notifications
 * state (device-local, not team-scoped) and takes only the identity + a
 * sign-out callback from the host. This is the piece the standalone
 * /rondo hub was missing — team-scoped settings still live on the in-app
 * Profile screen (MProfile/PProfile).
 */
"use client";

import * as React from "react";
import { initials } from "@saas/rondo-core";
import { C5, Icon, ink, Toggle } from "./kit5";
import { enableNotifications, notifyState, type NotifyState } from "../notifications";

export interface AccountInfo {
  name: string;
  email: string | null;
  onSignOut: () => void;
}

export function AccountCard5({ name, email, onSignOut }: AccountInfo) {
  const [notif, setNotif] = React.useState<NotifyState>("default");
  React.useEffect(() => {
    setNotif(notifyState());
  }, []);

  function toggleNotifications() {
    if (notif === "granted" || notif === "unsupported") return;
    void enableNotifications().then(setNotif);
  }

  return (
    <div style={{ borderRadius: 20, background: C5.card, border: `1px solid ${ink(0.12)}`, padding: 16, flex: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
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
          {initials(name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: C5.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name}
          </div>
          <div style={{ marginTop: 2, fontSize: 12, color: ink(0.5), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email ?? "Signed in"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 13, background: ink(0.04) }}>
          <Icon name="bell" size={15} color={ink(0.55)} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C5.ink }}>Notifications</span>
          <Toggle on={notif === "granted"} {...(notif === "unsupported" ? {} : { onClick: toggleNotifications })} />
        </div>

        <div
          onClick={onSignOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 13,
            background: "rgba(176,81,47,.08)",
            border: "1px solid rgba(176,81,47,.28)",
            cursor: "pointer",
          }}
        >
          <Icon name="logout" size={15} color={C5.rust} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C5.rust }}>Sign out</span>
        </div>
      </div>
    </div>
  );
}
