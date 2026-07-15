/*
 * AddPlayerSheet — the manager's "add a player to the squad" bottom sheet,
 * opened from Manage Squad. A search-style name field plus a position picker
 * (and optional contact details) scouts a new roster member. Presentational —
 * the host wires `onAdd` to the live `addPlayer` handler.
 */
"use client";

import * as React from "react";
import { C, ink, green, Icon } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";
const POSITIONS = ["GK", "DEF", "MID", "FWD", "ALL"] as const;
type Position = (typeof POSITIONS)[number];

export function AddPlayerSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: { name: string; position: string; email?: string | null; phone?: string | null }) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [name, setName] = React.useState("");
  const [pos, setPos] = React.useState<Position>("MID");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset when the sheet re-opens so a fresh add starts blank.
  React.useEffect(() => {
    if (open) {
      setName("");
      setPos("MID");
      setEmail("");
      setPhone("");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const canAdd = name.trim().length > 0 && !busy;
  async function submit() {
    if (name.trim().length === 0 || busy) return;
    setBusy(true);
    setError(null);
    const res = await onAdd({
      name: name.trim(),
      position: pos,
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
    });
    setBusy(false);
    if (res.ok) onClose();
    else setError(res.message || "Couldn't add the player. Try again.");
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,21,17,.35)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rk-anim-rise"
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "86dvh", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 16px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>Add a player</div>
        <div style={{ fontSize: 12.5, color: ink(0.55), marginTop: 2 }}>Search by name, pick a position, add to the squad.</div>

        {/* search-style name field */}
        <div style={{ marginTop: 18, height: 52, borderRadius: 16, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 10 }}>
          <Icon name="search" size={16} color={ink(0.4)} />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Player name"
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: C.ink }}
          />
          {name.trim() && (
            <div onClick={() => setName("")} className="rk-press" aria-label="Clear"><Icon name="x" size={14} color={ink(0.35)} /></div>
          )}
        </div>

        {/* position picker */}
        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>POSITION</div>
        <div style={{ marginTop: 10, display: "flex", gap: 7 }}>
          {POSITIONS.map((p) => {
            const on = p === pos;
            return (
              <div
                key={p}
                onClick={() => setPos(p)}
                className="rk-press"
                style={{ flex: 1, height: 42, borderRadius: 13, background: on ? C.green : C.card, border: on ? "none" : `1px solid ${ink(0.12)}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 11, fontWeight: 700, color: on ? C.onDark : ink(0.55) }}
              >
                {p}
              </div>
            );
          })}
        </div>

        {/* optional contact */}
        <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.5, color: ink(0.5) }}>CONTACT · OPTIONAL</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            inputMode="email"
            style={{ height: 48, borderRadius: 14, background: C.card, padding: "0 14px", border: `1px solid ${ink(0.14)}`, outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, color: C.ink }}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            inputMode="tel"
            style={{ height: 48, borderRadius: 14, background: C.card, padding: "0 14px", border: `1px solid ${ink(0.14)}`, outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, color: C.ink }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 12, background: "rgba(176,81,47,.12)", border: "1px solid rgba(176,81,47,.3)", color: C.rust, fontSize: 12.5 }}>{error}</div>
        )}

        <button
          onClick={submit}
          disabled={!canAdd}
          className="rk-press"
          style={{ marginTop: 20, width: "100%", height: 54, borderRadius: 16, border: "none", background: canAdd ? C.green : green(0.3), color: C.onDark, fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: canAdd ? "pointer" : "default", opacity: canAdd ? 1 : 0.7 }}
        >
          <Icon name="check" size={16} color={C.onDark} stroke={3} /> {busy ? "Adding…" : "Add to squad"}
        </button>
      </div>
    </div>
  );
}
