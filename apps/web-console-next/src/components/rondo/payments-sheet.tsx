/*
 * PaymentsSheet — the manager's pitch-fee ledger for the current match. Tap a
 * player to toggle whether they've paid; the header tracks the collected count.
 * Presentational; the host passes the roster + paid map + a toggle callback.
 */
"use client";

import * as React from "react";
import { C, ink, green, Avatar, Icon } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

export type PayerRow = { id: string; name: string; initials: string; pos: string; posColor: string };

export function PaymentsSheet({
  open,
  onClose,
  players,
  paid,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  players: PayerRow[];
  paid: Record<string, boolean>;
  onToggle: (playerId: string, paid: boolean) => void;
}) {
  if (!open) return null;
  const paidCount = players.filter((p) => paid[p.id]).length;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>Payments</div>
            <div style={{ fontSize: 12.5, color: ink(0.55), marginTop: 2 }}>Who&rsquo;s paid for the pitch.</div>
          </div>
          <div style={{ textAlign: "center", flex: "none" }}>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: C.green, lineHeight: 1 }}>{paidCount}<span style={{ color: ink(0.3), fontSize: 16 }}>/{players.length}</span></div>
            <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: ink(0.45), marginTop: 2 }}>PAID</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 7 }}>
          {players.map((p) => {
            const isPaid = !!paid[p.id];
            return (
              <div
                key={p.id}
                onClick={() => onToggle(p.id, !isPaid)}
                className="rk-press"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: C.card, border: `1px solid ${isPaid ? green(0.4) : ink(0.1)}` }}
              >
                <Avatar initials={p.initials} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, color: p.posColor, marginTop: 1 }}>{p.pos}</div>
                </div>
                <div style={{ width: 26, height: 26, borderRadius: 9, background: isPaid ? C.green : C.surface, border: isPaid ? "none" : `1.5px solid ${ink(0.2)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.onDark }}>
                  {isPaid && <Icon name="check" size={15} stroke={3} />}
                </div>
              </div>
            );
          })}
          {players.length === 0 && <div style={{ textAlign: "center", padding: 16, fontSize: 13, color: ink(0.5) }}>No players yet.</div>}
        </div>
      </div>
    </div>
  );
}
