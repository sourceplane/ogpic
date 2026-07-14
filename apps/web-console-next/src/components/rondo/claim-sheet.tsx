/*
 * ClaimSheet — a member picks which roster player is them so they can manage
 * their own availability. The server only lets you claim the player whose email
 * matches your account, so a mismatch surfaces as an inline error.
 */
"use client";

import * as React from "react";
import { C, ink, Avatar, Icon } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type ClaimCandidate = { id: string; name: string; initials: string; pos: string; claimed: boolean };

export function ClaimSheet({
  open,
  onClose,
  players,
  onClaim,
}: {
  open: boolean;
  onClose: () => void;
  players: ClaimCandidate[];
  onClaim: (id: string) => Promise<boolean>;
}) {
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setBusyId(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function pick(id: string) {
    setBusyId(id);
    setError(null);
    const ok = await onClaim(id);
    setBusyId(null);
    if (ok) onClose();
    else setError("That player isn't linked to your email. Ask your manager to set your email on the roster.");
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
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 16px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>Which one is you?</div>
        <div style={{ fontSize: 12.5, color: ink(0.55), marginTop: 2 }}>Claim your spot to set your own availability.</div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: "rgba(176,81,47,.12)", border: "1px solid rgba(176,81,47,.3)", color: C.rust, fontSize: 12 }}>{error}</div>
        )}

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map((p) => (
            <div
              key={p.id}
              onClick={() => !p.claimed && busyId == null && pick(p.id)}
              className={!p.claimed ? "rk-press" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.1)}`, opacity: p.claimed ? 0.5 : 1 }}
            >
              <Avatar initials={p.initials} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: ink(0.45), marginTop: 1 }}>{p.pos}{p.claimed ? " · CLAIMED" : ""}</div>
              </div>
              {busyId === p.id ? (
                <span style={{ fontFamily: MONO, fontSize: 9.5, color: ink(0.45) }}>…</span>
              ) : !p.claimed ? (
                <Icon name="chevronRight" size={16} color={ink(0.35)} />
              ) : null}
            </div>
          ))}
          {players.length === 0 && <div style={{ textAlign: "center", padding: 16, fontSize: 13, color: ink(0.5) }}>No players on the roster yet.</div>}
        </div>
      </div>
    </div>
  );
}
