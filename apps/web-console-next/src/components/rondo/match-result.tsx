/*
 * MatchResultSheet — the manager records a final score for the current match.
 * Home/away steppers → save flips the fixture to 'played' with the score. The
 * host wires onSave to the live recordResult handler.
 */
"use client";

import * as React from "react";
import { C, ink, rust, Icon } from "./kit";

const MONO = "var(--font-jbmono), ui-monospace, monospace";

function Stepper({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 56, fontWeight: 700, color: C.ink, letterSpacing: -2, lineHeight: 1.1 }}>{value}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 4 }}>
        <div onClick={() => onChange(Math.max(0, value - 1))} className="rk-press" style={{ width: 42, height: 42, borderRadius: 13, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: C.ink }}>−</div>
        <div onClick={() => onChange(value + 1)} className="rk-press" style={{ width: 42, height: 42, borderRadius: 13, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: C.onDark }}>+</div>
      </div>
    </div>
  );
}

export function MatchResultSheet({
  open,
  onClose,
  onSave,
  homeLabel = "HOME",
  awayLabel = "AWAY",
}: {
  open: boolean;
  onClose: () => void;
  onSave: (scoreA: number, scoreB: number) => void;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const [a, setA] = React.useState(0);
  const [b, setB] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setA(0);
      setB(0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,21,17,.35)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rk-anim-rise"
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "10px 20px 28px", maxWidth: 430, width: "100%", margin: "0 auto" }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: ink(0.15), margin: "0 auto 16px" }} />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>Full time</div>
        <div style={{ fontSize: 12.5, color: ink(0.55), marginTop: 2 }}>Record the final score to close out the match.</div>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 6 }}>
          <Stepper label={homeLabel} value={a} color={C.green} onChange={setA} />
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: ink(0.3) }}>:</span>
          <Stepper label={awayLabel} value={b} color={rust(1)} onChange={setB} />
        </div>

        <button
          onClick={() => { onSave(a, b); onClose(); }}
          className="rk-press"
          style={{ marginTop: 22, width: "100%", height: 54, borderRadius: 16, border: "none", background: C.ink, color: C.onDark, fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}
        >
          <Icon name="check" size={16} color={C.onDark} stroke={3} /> Save result
        </button>
      </div>
    </div>
  );
}
