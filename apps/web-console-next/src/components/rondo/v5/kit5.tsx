/*
 * Rondo v5 "night-pitch" design system — the shared primitives every v5
 * screen imports from. Pixel-sourced from docs/design/rondo-v5-reference.html
 * (read alongside docs/design/rondo-v5-spec.md §1/§2) — colours, radii, chip
 * copy and the pitch/hero/sheet/dock shapes are lifted verbatim from the
 * design canvas so v5 screens compose from one system, the same way
 * ../kit.tsx does for v4. Self-contained: no import from ../kit, no CSS
 * modules/Tailwind — every value is an inline style literal, exactly like the
 * design file.
 *
 * Presentational only — no data fetching, no VM access. Screens wire
 * behaviour (RondoVM) through the primitives below.
 */
"use client";

import * as React from "react";
import type { MatchPhase } from "@saas/rondo-core";
import { EASE, Pressable, useReducedMotion } from "./anim5";

/* ── design tokens (spec §1) ──────────────────────────────────────────── */

export const C5 = {
  paper: "#E9E4D8",
  surface: "#F5F2E9",
  card: "#FFFFFF",
  sheet: "#F7F4EB",
  ink: "#0E1B14",
  green: "#1E8A5E",
  greenBright: "#5FD8A2",
  gold: "#C9A24B",
  goldText: "#8A6D2C",
  goldBg: "rgba(201,162,75,.18)",
  rust: "#B0512F",
  wa: "#25D366",
  waText: "#128C4B",
  heroGrad: "linear-gradient(150deg,#0C1912 0%,#17402B 70%,#1E8A5E 185%)",
  pitchTop: "linear-gradient(180deg,#143523,#102B1C)",
  pitchBottom: "linear-gradient(0deg,#2E1D10,#241A12)",
  pitchLine: "rgba(245,242,233,.32)",
  track: "#E8E4D6",
} as const;

/** `ink(a)` — the design's `rgba(14,27,20,<a>)` secondary/tertiary-ink helper
 *  (`.55` secondary, `.45`/`.4` tertiary, `.12`/`.14` hairline borders, …). */
export function ink(a: number): string {
  return `rgba(14,27,20,${a})`;
}

/** JetBrains Mono, wired to the `--font-jbmono` variable the route layout
 *  (`app/rondo/layout.tsx`) already loads. Space Grotesk is the inherited
 *  body font — screens never need to set it explicitly. */
export const MONO = "var(--font-jbmono), ui-monospace, monospace";

/* ── icons ────────────────────────────────────────────────────────────── */

export type IconName =
  | "search"
  | "x"
  | "check"
  | "plus"
  | "back"
  | "chevronR"
  | "chevronD"
  | "home"
  | "matchesBall"
  | "chat"
  | "squad"
  | "star"
  | "bell"
  | "share"
  | "mapPin"
  | "whatsapp"
  | "userPlus"
  | "logout"
  | "calendar"
  | "camera"
  | "image"
  | "megaphone"
  | "refresh"
  | "zap"
  | "link"
  | "qr"
  | "flag"
  | "lock";

export function Icon({
  name,
  size = 20,
  color = "currentColor",
  stroke = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </>
    ),
    x: <path d="M18 6L6 18M6 6l12 12" />,
    check: <path d="M20 6L9 17l-5-5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    back: <path d="M15 18l-6-6 6-6" />,
    chevronR: <path d="M9 18l6-6-6-6" />,
    chevronD: <path d="M6 9l6 6 6-6" />,
    home: <path d="M3 11l9-8 9 8v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />,
    matchesBall: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18" />
      </>
    ),
    chat: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />,
    squad: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </>
    ),
    star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L2 9.3l6.1-.7L12 3z" />,
    // Design reuses the same silhouette for the notification bell and the
    // Announcement sheet tile (reference lines ~628-637) — kept identical here
    // for the same reason: `megaphone` intentionally shares this path.
    bell: (
      <>
        <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 01-3.4 0" />
      </>
    ),
    megaphone: (
      <>
        <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 01-3.4 0" />
      </>
    ),
    share: (
      <>
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
        <path d="M16 6l-4-4-4 4M12 2v13" />
      </>
    ),
    mapPin: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21c4-4 7-7.6 7-11a7 7 0 10-14 0c0 3.4 3 7 7 11z" />
      </>
    ),
    // Design has no bespoke WhatsApp glyph — the invite/WA-bridge rows reuse
    // the chat-bubble path (reference lines 660, 686). Kept identical here.
    whatsapp: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />,
    userPlus: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <path d="M19 8v6M22 11h-6" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
    camera: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7l1.5-2h5L16 7" />
        <circle cx="12" cy="13.5" r="3.2" />
      </>
    ),
    // The design's own "Photo" sheet tile (reference line 628).
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </>
    ),
    refresh: (
      <>
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />
      </>
    ),
    zap: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
    // The design's "Join a team" chain-link glyph (reference line 81).
    link: (
      <>
        <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" />
      </>
    ),
    // The design's QR stub icon (reference line 657).
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
      </>
    ),
    // The design's "Match result" sheet-tile glyph (reference line 624).
    flag: <path d="M4 22V4a2 2 0 012-2h12l-3 5 3 5H6" />,
    lock: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 018 0v4" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

/* ── mono micro-label + chips ─────────────────────────────────────────── */

/** Section captions ("POSITION", "SCORE · TAP SEGMENTS", …): 8-10px,
 *  600-700 weight, 1.5px letter-spacing, uppercase, JetBrains Mono. */
export function MonoLabel({
  children,
  size = 9,
  weight = 600,
  tone = 0.5,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: number;
  tone?: number;
  style?: React.CSSProperties | undefined;
}) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: ink(tone),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A generic mono pill (role/status tags across headers, rows, cards) — the
 *  caller supplies bg/fg (see `PhaseChip` for the phase-specific mapping). */
export function ChipTag({
  bg,
  fg,
  children,
  size = 8.5,
  style,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties | undefined;
}) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 700,
        padding: "4px 9px",
        borderRadius: 10,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** Match-lifecycle phase chip (Matches list, match-detail header, spec §2
 *  screen 4 + reference lines 172-185/1228): poll/finalizing/draft → gold,
 *  scheduled (and the post-schedule tail) → green. */
export function PhaseChip({ phase, style }: { phase: MatchPhase; style?: React.CSSProperties | undefined }) {
  const map: Record<MatchPhase, { label: string; bg: string; fg: string }> = {
    poll: { label: "POLL LIVE", bg: C5.goldBg, fg: C5.goldText },
    finalizing: { label: "FINALIZING", bg: C5.goldBg, fg: C5.goldText },
    draft: { label: "DRAFTING", bg: C5.goldBg, fg: C5.goldText },
    scheduled: { label: "SCHEDULED", bg: "rgba(30,138,94,.12)", fg: C5.green },
    live: { label: "LIVE", bg: "rgba(30,138,94,.12)", fg: C5.green },
    played: { label: "PLAYED", bg: ink(0.06), fg: ink(0.55) },
    cancelled: { label: "CANCELLED", bg: "rgba(176,81,47,.12)", fg: C5.rust },
  };
  const m = map[phase];
  return (
    <ChipTag bg={m.bg} fg={m.fg} style={style}>
      {m.label}
    </ChipTag>
  );
}

/** Rating Window v2's settled-delta chip (MRate's RESULTS list, PRate's
 *  LAST WINDOW summary — docs/design/rondo-rating-window-spec.md): green
 *  `▲+n` for a gain, rust `▼-n` for a drop, neutral `·` for no change. */
export function DeltaChip({ delta, size = 9 }: { delta: number; size?: number }) {
  if (delta > 0) return <ChipTag bg="rgba(30,138,94,.14)" fg={C5.green} size={size}>{`▲+${delta}`}</ChipTag>;
  if (delta < 0) return <ChipTag bg="rgba(176,81,47,.14)" fg={C5.rust} size={size}>{`▼${delta}`}</ChipTag>;
  return (
    <ChipTag bg={ink(0.06)} fg={ink(0.5)} size={size}>
      ·
    </ChipTag>
  );
}

/* ── decorative helpers ───────────────────────────────────────────────── */

/** The hero's decorative ring outlines. `variant: "hero"` is the ticket-hero
 *  pair (reference lines 100-101); `"login"` is the taller login backdrop's
 *  two rings + halfway line (reference lines 39-41). */
export function heroCircles(variant: "hero" | "login" = "hero"): React.ReactNode {
  if (variant === "login") {
    return (
      <>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 250,
            height: 250,
            border: "2px solid rgba(245,242,233,.1)",
            borderRadius: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 150,
            height: 150,
            border: "2px solid rgba(245,242,233,.08)",
            borderRadius: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 2, background: "rgba(245,242,233,.07)" }} />
      </>
    );
  }
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: -50,
          top: -50,
          width: 170,
          height: 170,
          border: "2px solid rgba(245,242,233,.1)",
          borderRadius: "50%",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -10,
          top: 30,
          width: 90,
          height: 90,
          border: "2px solid rgba(245,242,233,.08)",
          borderRadius: "50%",
        }}
      />
    </>
  );
}

/** The hero's dashed section divider (reference line 117) — spread this into
 *  a wrapper `div`'s style alongside layout props (margin/padding/display). */
export const dashedDivider: React.CSSProperties = {
  borderTop: "1.5px dashed rgba(245,242,233,.22)",
};

/* ── ticket hero ──────────────────────────────────────────────────────── */

/** The signature heroGrad card (Home's "next match" ticket, the confirmed
 *  ticket on match-detail scheduled, the login panel's backdrop) — decorative
 *  ring outlines, 22-24px radius, `heroGrad` background. Content is the
 *  caller's own layout (mono chips, title, dashed-divider row, …). */
export function TicketHero({
  onClick,
  children,
  style,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties | undefined;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 24,
        background: C5.heroGrad,
        color: C5.surface,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 18px 34px -20px rgba(14,27,20,.55)",
        padding: 20,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {heroCircles("hero")}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

/* ── night pitch ──────────────────────────────────────────────────────── */

/** A player token placed on the pitch, in percent coordinates. `id` doubles
 *  as the token's on-pitch label (a 2-4 char code, e.g. "MS") and the value
 *  passed back to `onSwap`. */
export interface PitchToken {
  id: string;
  nm: string;
  ovr: number;
  x: number;
  y: number;
}

/** The two-tone night pitch (green top / rust bottom halves), inset border,
 *  halfway line, centre "VS" disc and glowing player tokens with name pills —
 *  reused for the interactive draft board (reference lines 363-381, tap a
 *  token to swap sides) and the read-only scheduled lineup (reference lines
 *  412-430). `a`/`b` are the two sides' tokens; `mePlayerId` gets the
 *  double-ring glow in both variants. */
export function NightPitch({
  a,
  b,
  height = 330,
  interactive = false,
  onSwap,
  mePlayerId = null,
  kitA = C5.green,
  kitB = C5.rust,
  tokenSize,
  style,
}: {
  a: PitchToken[];
  b: PitchToken[];
  height?: number;
  interactive?: boolean;
  onSwap?: (id: string) => void;
  mePlayerId?: string | null;
  kitA?: string;
  kitB?: string;
  tokenSize?: number;
  style?: React.CSSProperties | undefined;
}) {
  const size = tokenSize ?? (interactive ? 42 : 34);
  const inset = interactive ? 12 : 10;
  const vs = interactive ? 72 : 56;

  // #10 token settle — tokens fly in from a slight downward offset to their
  // slots with a staggered spring on mount / whenever the drafted set of
  // players changes. Positions (left/top) are unchanged; only transform +
  // opacity animate, so a swap (same id-set, new position) still snaps as
  // before. Read-only: `placeDraft` remains the source of truth.
  const reduced = useReducedMotion();
  const rosterSig = React.useMemo(
    () => [...a.map((p) => p.id), "|", ...b.map((p) => p.id)].sort().join(","),
    [a, b],
  );
  const [settled, setSettled] = React.useState(false);
  React.useEffect(() => {
    setSettled(false);
    const r = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(r);
  }, [rosterSig]);
  const shown = reduced || settled;

  const renderSide = (list: PitchToken[], kit: string, baseIndex: number) =>
    list.map((p, i) => {
      const isMe = mePlayerId != null && p.id === mePlayerId;
      const glow = isMe
        ? `0 0 0 3px rgba(245,242,233,.95), 0 0 0 6px ${kit}`
        : `0 0 ${interactive ? 16 : 14}px ${kit}${interactive ? "90" : "66"}`;
      return (
        <div
          key={p.id}
          onClick={interactive && onSwap ? () => onSwap(p.id) : undefined}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: shown ? "translate(-50%,-50%) scale(1)" : "translate(-50%,calc(-50% + 34px)) scale(.6)",
            opacity: shown ? 1 : 0,
            transition: reduced ? undefined : `transform 500ms ${EASE}, opacity 380ms ${EASE}`,
            transitionDelay: reduced ? undefined : `${(baseIndex + i) * 45}ms`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: interactive ? 3 : 2,
            cursor: interactive && onSwap ? "pointer" : undefined,
          }}
        >
          <div
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: kit,
              color: C5.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: interactive ? 11 : 9.5,
              fontWeight: 700,
              boxShadow: glow,
              flex: "none",
            }}
          >
            {p.id}
          </div>
          <span
            style={{
              fontSize: interactive ? 9 : 8,
              fontWeight: 700,
              color: C5.ink,
              background: `rgba(245,242,233,${interactive ? 0.92 : 0.9})`,
              borderRadius: interactive ? 6 : 5,
              padding: interactive ? "1px 6px" : "1px 5px",
              whiteSpace: "nowrap",
            }}
          >
            {interactive ? `${p.nm} ${p.ovr}` : p.nm}
          </span>
        </div>
      );
    });

  return (
    <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", height, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "50%", background: C5.pitchTop }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", background: C5.pitchBottom }} />
      <div style={{ position: "absolute", inset, border: `2px solid ${C5.pitchLine}`, borderRadius: 10 }} />
      <div style={{ position: "absolute", left: inset, right: inset, top: "50%", height: 2, background: C5.pitchLine }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: vs,
          height: vs,
          border: `2px solid ${C5.pitchLine}`,
          borderRadius: "50%",
          transform: "translate(-50%,-50%)",
          background: C5.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: interactive ? 12 : 10, fontWeight: 700, color: C5.surface }}>VS</span>
      </div>
      {renderSide(a, kitA, 0)}
      {renderSide(b, kitB, a.length)}
    </div>
  );
}

/* ── segments / toggle ────────────────────────────────────────────────── */

/** 5 tappable rating segments (replaces sliders) — filled `green`, empty
 *  `track` (reference lines 543-553). Read-only when `onChange` is omitted. */
export function SegmentBar({
  value,
  max = 5,
  onChange,
  size = 24,
}: {
  value: number;
  max?: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          onClick={onChange ? () => onChange(i + 1) : undefined}
          style={{
            flex: 1,
            height: size,
            borderRadius: 8,
            background: i < value ? C5.green : C5.track,
            cursor: onChange ? "pointer" : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** The 44×26 switch (reference line 557; also used for the WhatsApp-bridge
 *  and manager-role rows, which pass their own `onColor`). Defaults to
 *  `green`, off-state is always `rgba(14,27,20,.18)`. */
export function Toggle({
  on,
  onClick,
  onColor = C5.green,
}: {
  on: boolean;
  onClick?: () => void;
  onColor?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        background: on ? onColor : "rgba(14,27,20,.18)",
        position: "relative",
        cursor: onClick ? "pointer" : undefined,
        flex: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(14,27,20,.3)",
          transition: "left .15s ease",
        }}
      />
    </div>
  );
}

/* ── bottom sheet ─────────────────────────────────────────────────────── */

/** The floating bottom sheet (reference lines 608-613): `rgba(14,27,20,.4)`
 *  backdrop, `sheet` bg card at 26px radius with a grab handle. Renders
 *  nothing when `open` is false. Backdrop click calls `onClose`; the card
 *  itself stops that click from bubbling. */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  // Keep the sheet mounted through its exit so the spring-down/backdrop-fade
  // can play; `open`/`onClose` semantics are unchanged.
  const [mounted, setMounted] = React.useState(open);
  const [shown, setShown] = React.useState(false);
  const [dragY, setDragY] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const drag = React.useRef({ active: false, startY: 0, height: 1, pointerId: -1 });

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setDragY(0);
      const r = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), reduced ? 0 : 340);
    return () => clearTimeout(t);
  }, [open, reduced]);

  const onHandleDown = React.useCallback<React.PointerEventHandler<HTMLDivElement>>((e) => {
    const h = cardRef.current?.offsetHeight ?? 1;
    drag.current = { active: true, startY: e.clientY, height: h, pointerId: e.pointerId };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* best-effort */
    }
  }, []);
  const onHandleMove = React.useCallback<React.PointerEventHandler<HTMLDivElement>>((e) => {
    if (!drag.current.active) return;
    setDragY(Math.max(0, e.clientY - drag.current.startY));
  }, []);
  const onHandleUp = React.useCallback<React.PointerEventHandler<HTMLDivElement>>(
    (e) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      setDragging(false);
      const dy = Math.max(0, e.clientY - drag.current.startY);
      if (dy > drag.current.height * 0.3) onClose();
      else setDragY(0);
    },
    [onClose],
  );

  if (!mounted) return null;

  const backdropOpacity = shown ? (dragging ? Math.max(0, 1 - dragY / (drag.current.height || 1)) : 1) : 0;
  const cardTransform = dragging
    ? `translateY(${dragY}px)`
    : shown
      ? "translateY(0)"
      : "translateY(102%)";

  return (
    <div
      className="rk5-sheet-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(14,27,20,.4)",
        opacity: backdropOpacity,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      <div
        ref={cardRef}
        className="rk5-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "calc(100% - 20px)",
          maxWidth: 430,
          marginBottom: 10,
          boxSizing: "border-box",
          background: C5.sheet,
          borderRadius: 26,
          padding: "14px 20px 20px",
          boxShadow: "0 -12px 40px rgba(14,27,20,.3)",
          maxHeight: "86dvh",
          overflowY: "auto",
          transform: cardTransform,
          transition: dragging ? "none" : undefined,
        }}
      >
        <div
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          style={{ padding: "2px 0 8px", margin: "-2px 0 0", cursor: "grab", touchAction: "none" }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(14,27,20,.15)", margin: "0 auto" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── dock nav ─────────────────────────────────────────────────────────── */

export interface DockItem {
  key: string;
  label: string;
  icon: IconName;
  /** Shows the rust "!" badge dot (reference lines 1154-1156) — set when a
   *  poll needs the viewer's vote (Matches) or the rating window is open
   *  (Rate). */
  badge?: boolean;
}

/** The floating white dock (reference lines 697-704): 62px tall, 22px radius,
 *  `0 12px 28px -12px rgba(14,27,20,.4)` shadow, `8px 14px 12px` margin. */
export function DockNav({
  items,
  active,
  onSelect,
}: {
  items: DockItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      style={{
        height: 62,
        flex: "none",
        margin: "8px 14px 12px",
        borderRadius: 22,
        background: C5.card,
        border: `1px solid ${ink(0.08)}`,
        boxShadow: "0 12px 28px -12px rgba(14,27,20,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 18px",
      }}
    >
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Pressable
            key={it.key}
            onClick={() => onSelect(it.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              color: on ? C5.ink : ink(0.4),
              cursor: "pointer",
              position: "relative",
            }}
          >
            <span
              style={{
                display: "block",
                transform: on ? "scale(1.16)" : "scale(1)",
                transition: `transform 280ms ${EASE}`,
              }}
            >
              <Icon name={it.icon} size={20} />
            </span>
            <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1 }}>{it.label}</span>
            {it.badge && (
              <span
                className="rk5-badge-pop"
                style={{
                  position: "absolute",
                  top: -5,
                  right: -8,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: C5.rust,
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                !
              </span>
            )}
          </Pressable>
        );
      })}
    </div>
  );
}

/* ── progress steps ───────────────────────────────────────────────────── */

/** The 5px progress track (reference lines 179-180) — Matches cards
 *  (`POLL → DRAFT → SCHEDULED`) and the wizard's step bar. */
export function ProgressSteps({ percent, color = C5.green }: { percent: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, percent));
  // Eased fill via `scaleX` (transform, GPU-friendly) rather than animating
  // the layout `width` — the reduced-motion media query collapses it.
  return (
    <div style={{ height: 5, borderRadius: 3, background: C5.track, overflow: "hidden" }}>
      <div
        className="rk5-bar"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 3,
          background: color,
          transform: `scaleX(${pct / 100})`,
          transformOrigin: "left",
        }}
      />
    </div>
  );
}

/* ── toast ────────────────────────────────────────────────────────────── */

/** Bottom-center dark pill toast, 2.6s auto-hide (reference line 695). Call
 *  the returned `toast(msg)` from anywhere; render `node` once near the root
 *  of the screen/shell (it's `position: fixed`, so placement doesn't matter). */
export function useToast(): { toast: (msg: string) => void; node: React.ReactNode } {
  const [msg, setMsg] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = React.useRef(0);

  const toast = React.useCallback((m: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    cancelAnimationFrame(rafRef.current);
    setMsg(m);
    setShown(false);
    // Next frame → flip to shown so the spring-up entrance transition plays.
    rafRef.current = requestAnimationFrame(() => setShown(true));
    hideTimer.current = setTimeout(() => setShown(false), 2600);
    clearTimer.current = setTimeout(() => setMsg(""), 2940);
  }, []);

  React.useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const node = msg ? (
    <div
      className="rk5-toast"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 14,
        transform: shown ? "translateX(-50%) translateY(0) scale(1)" : "translateX(-50%) translateY(16px) scale(.94)",
        opacity: shown ? 1 : 0,
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        padding: "10px 18px",
        borderRadius: 20,
        background: C5.ink,
        color: C5.surface,
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 10px 24px -8px rgba(14,27,20,.5)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {msg}
    </div>
  ) : null;

  return { toast, node };
}
