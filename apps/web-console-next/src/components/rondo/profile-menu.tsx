/*
 * ProfileSheet — the personal account menu, opened from the avatar (distinct
 * from the manager's ⚙️ team settings). Shows the signed-in user's name + email,
 * their own score when we can match them to a roster player by email, and a
 * sign-out. Self-contained: reads the profile and drives logout through the
 * session, so any screen (start page, manager/player home) can drop it in.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { useApiQuery } from "@/lib/query";
import { wrap } from "@/lib/api";
import { C, ink, green, gold, Avatar, Icon } from "./kit";
import { PlayerStatsSheet } from "./player-stats";
import { getStoredTheme, applyTheme, type Theme } from "./theme";
import type { PlayerStats } from "./use-rondo";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

/** A roster player the viewer might be, used to surface "my score" by email. */
export type ProfilePlayer = {
  name: string;
  email?: string | null;
  ovr: number;
  pos?: string;
  skills?: Record<string, number>;
  stats?: PlayerStats | undefined;
};

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function ProfileSheet({
  open,
  onClose,
  players,
}: {
  open: boolean;
  onClose: () => void;
  players?: ProfilePlayer[] | undefined;
}) {
  const router = useRouter();
  const { client, setToken } = useSession();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<Theme>("system");
  React.useEffect(() => setTheme(getStoredTheme()), []);

  const profile = useApiQuery(
    ["auth-profile"],
    () => wrap(async () => (await client.auth.getProfile()).user),
    { enabled: open },
  );

  if (!open) return null;

  const email = profile.data?.email ?? null;
  const name = profile.data?.displayName || (email ? email.split("@")[0]! : "You");
  const me =
    email && players
      ? players.find((p) => p.email && p.email.toLowerCase() === email.toLowerCase())
      : undefined;

  async function logout() {
    if (busy) return;
    setBusy(true);
    await wrap(() => client.auth.logout()).catch(() => undefined);
    setToken(null);
    qc.clear();
    router.replace("/rondo");
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,21,17,.35)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rk-anim-rise"
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "82dvh", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 18px" }} />

        {/* identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar initials={initialsOf(name)} size={54} bg={C.card} ring={gold(0.9)} color={C.ink} style={{ fontSize: 20 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: ink(0.5), marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email ?? "—"}</div>
          </div>
        </div>

        {/* my score */}
        <div
          onClick={me && me.skills ? () => setStatsOpen(true) : undefined}
          className={me && me.skills ? "rk-press" : undefined}
          style={{ marginTop: 18, borderRadius: 18, background: C.card, border: `1px solid ${ink(0.1)}`, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 14, background: green(0.12), display: "flex", alignItems: "center", justifyContent: "center", color: C.green, flex: "none" }}>
            <Icon name="rate" size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: ink(0.45) }}>MY SCORE</div>
            {me ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 2 }}>{me.name}</div>
                {me.stats && (
                  <div style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.5), marginTop: 2 }}>
                    {me.stats.apps} PLAYED · {me.stats.wins}W {me.stats.draws}D {me.stats.losses}L
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: ink(0.5), marginTop: 3, lineHeight: 1.35 }}>
                {players ? "Not linked to a player in this squad yet." : "Open a squad to see your rating."}
              </div>
            )}
          </div>
          {me && <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: C.green, letterSpacing: -1 }}>{me.ovr}</div>}
          {me && me.skills && <Icon name="chevronRight" size={16} color={ink(0.3)} />}
        </div>

        {me && me.skills && (
          <PlayerStatsSheet
            player={statsOpen ? { name: me.name, pos: me.pos ?? "", ovr: me.ovr, skills: me.skills } : null}
            stats={me.stats}
            onClose={() => setStatsOpen(false)}
          />
        )}

        {/* theme */}
        <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>APPEARANCE</div>
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          {(["system", "light", "dark"] as Theme[]).map((t) => {
            const on = theme === t;
            return (
              <div
                key={t}
                onClick={() => { setTheme(t); applyTheme(t); }}
                className="rk-press"
                style={{ flex: 1, height: 44, borderRadius: 13, background: on ? C.ink : C.card, border: on ? "none" : `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, color: on ? C.onDark : ink(0.6), textTransform: "capitalize" }}
              >
                {t}
              </div>
            );
          })}
        </div>

        {/* sign out */}
        <div
          onClick={logout}
          className="rk-press"
          style={{ marginTop: 16, height: 52, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: C.rust, fontSize: 14, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
        >
          <Icon name="logout" size={17} color={C.rust} /> {busy ? "Signing out…" : "Sign out"}
        </div>
      </div>
    </div>
  );
}
