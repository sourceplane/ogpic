/*
 * Rondo shared primitives (RX0). Small, token-driven building blocks the screens
 * compose. Inline styles are used deliberately to hold the prototype's exact
 * measurements (design-reference.md) — pixel fidelity over Tailwind churn — while
 * colors come from the scoped `--r-*` tokens in rondo.css.
 */
"use client";

import * as React from "react";

export function Mono({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span className="rondo-mono" style={style}>
      {children}
    </span>
  );
}

/** Faux iOS status bar — only visible in the desktop device frame. */
export function StatusBar() {
  return (
    <div
      className="rondo-statusbar"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 40,
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 30px 0",
        pointerEvents: "none",
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: "#F4F3F0", letterSpacing: ".3px" }}>9:41</span>
      <div
        style={{
          width: 118,
          height: 30,
          background: "#000",
          borderRadius: 16,
          position: "absolute",
          left: "50%",
          top: 12,
          transform: "translateX(-50%)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F4F3F0" }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" />
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none" aria-hidden>
          <rect x="1" y="1" width="19" height="9" rx="2.5" stroke="currentColor" strokeOpacity=".5" />
          <rect x="2.5" y="2.5" width="15" height="6" rx="1.2" fill="currentColor" />
          <rect x="21" y="4" width="2" height="3.5" rx="1" fill="currentColor" fillOpacity=".6" />
        </svg>
      </div>
    </div>
  );
}

/** A themed bottom sheet used for the team switcher, vote, and scorer overlays. */
export function BottomSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        background: "rgba(4,5,6,.72)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0 }} aria-hidden />
      <div
        className="r-anim-sheet rondo-sheet-panel"
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: "100%",
          background: "#121417",
          borderTop: "1px solid rgba(255,255,255,.1)",
          borderRadius: "28px 28px 0 0",
          padding: "14px 22px 30px",
          boxShadow: "0 -20px 50px rgba(0,0,0,.6)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "#2a2e34", margin: "0 auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

/** Hatched avatar disc with initials, matching the prototype's placeholder. */
export function Avatar({
  initials,
  size = 40,
  fontSize = 12,
  color = "#C9CBCE",
}: {
  initials: string;
  size?: number;
  fontSize?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "repeating-linear-gradient(45deg,#1a1d21,#1a1d21 4px,#15181c 4px,#15181c 8px)",
        border: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 800,
        color,
        flex: "none",
      }}
    >
      {initials}
    </div>
  );
}

/** Small square icon button (back chevrons, etc.). */
export function IconChip({
  onClick,
  children,
  size = 40,
  ariaLabel,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  size?: number;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: "#141619",
        border: "1px solid rgba(255,255,255,.08)",
        color: "#C9CBCE",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      {children}
    </button>
  );
}
