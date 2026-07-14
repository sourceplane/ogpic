/*
 * Rondo "Pitchside" v2 — the shared UI kit. Every primitive here is lifted
 * pixel-for-pixel from the approved design canvas (Rondo_v2, section 2) so the
 * onboarding / manager / player screens (Phases 2–4) compose from one system.
 *
 * Conventions:
 *  - Colours are literal hex from the canvas (guaranteed match); the same values
 *    live as `--rk-*` tokens in rondo-kit.css for the shell/CSS side.
 *  - Sizes/paddings are inline so a screen reads like the mockup it mirrors.
 *  - Presentational only — no data fetching, no app state. Screens wire behaviour.
 */
"use client";

import * as React from "react";

/* ── palette helpers ──────────────────────────────────────────── */
export const C = {
  ink: "#101511",
  onDark: "#F2F4F1",
  surface: "#F2F4F1",
  card: "#FFFFFF",
  pitch: "#E4EBE3",
  pitch2: "#E9ECE7",
  avatar: "#E4EBE3",
  segEmpty: "#EAEEE9",
  green: "#17694A",
  gold: "#C9A24B",
  goldInk: "#8A6D2C",
  rust: "#B0512F",
} as const;
export const ink = (a: number) => `rgba(16,21,17,${a})`;
export const green = (a: number) => `rgba(23,105,74,${a})`;
export const rust = (a: number) => `rgba(176,81,47,${a})`;
export const gold = (a: number) => `rgba(201,162,75,${a})`;

const MONO = "var(--font-jbmono), ui-monospace, monospace";

/* ── phone shell ──────────────────────────────────────────────
 * Wraps a screen in the responsive frame: full-bleed on mobile, a centered
 * 390×844 "phone" with the design's rounded frame + shadow on desktop.
 */
export function PhoneShell({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`rk rk-shell ${className}`} style={style}>
      <div className="rk-frame">{children}</div>
    </div>
  );
}

/* ── top inset ────────────────────────────────────────────────
 * The design canvas draws a phone status bar (9:41 + signal/battery) purely as
 * illustration — the actual product UI is the content. So this renders no fake
 * chrome: just a safe-area spacer that keeps content clear of the *real* device
 * status bar (notch) on mobile, and a small gap on desktop. Kept exported as
 * `StatusBar` so every screen's top slot stays a single call.
 */
export function StatusBar() {
  return <div aria-hidden style={{ height: "max(env(safe-area-inset-top), 12px)", flex: "none" }} />;
}

/* scrollable body region inside the frame */
export function ScreenBody({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="rk-scroll" style={style}>
      {children}
    </div>
  );
}

/* ── mono micro-label (field + section captions) ─────────────── */
export function MonoLabel({
  children,
  tone = 0.5,
  size = 9.5,
  style,
}: {
  children: React.ReactNode;
  tone?: number;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: 1.5,
        color: ink(tone),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* a section caption with an optional right-aligned value (e.g. "PENDING · 2") */
export function SectionRow({
  label,
  right,
  style,
}: {
  label: React.ReactNode;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", ...style }}>
      <MonoLabel>{label}</MonoLabel>
      {right != null && (
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: C.green }}>{right}</span>
      )}
    </div>
  );
}

/* ── chip / pill ──────────────────────────────────────────────
 * The mono status pills across headers, rows and cards.
 */
type ChipVariant =
  | "green"
  | "greenSoft"
  | "gold"
  | "goldSoft"
  | "ink"
  | "outline"
  | "rustSoft";

export function Chip({
  children,
  variant = "outline",
  style,
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
  style?: React.CSSProperties;
}) {
  const v: Record<ChipVariant, React.CSSProperties> = {
    green: { background: C.green, color: C.onDark },
    greenSoft: { background: green(0.12), color: C.green },
    gold: { background: C.gold, color: C.ink },
    goldSoft: { background: gold(0.18), color: C.goldInk },
    ink: { background: C.ink, color: C.onDark },
    outline: { background: C.card, border: `1px solid ${ink(0.12)}`, color: C.ink },
    rustSoft: { background: rust(0.14), color: C.rust },
  };
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: 600,
        padding: "5px 10px",
        borderRadius: 14,
        whiteSpace: "nowrap",
        ...v[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ── buttons ──────────────────────────────────────────────────── */
type BtnVariant = "green" | "ink" | "outline";
export function Button({
  children,
  variant = "green",
  height = 56,
  radius = 18,
  onClick,
  disabled,
  type = "button",
  style,
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  height?: number;
  radius?: number;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: React.CSSProperties;
}) {
  const v: Record<BtnVariant, React.CSSProperties> = {
    green: { background: C.green, color: C.onDark },
    ink: { background: C.ink, color: C.onDark },
    outline: { background: C.card, color: C.ink, border: `1.5px solid ${C.ink}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rk-press"
      style={{
        height,
        borderRadius: radius,
        border: "none",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        fontSize: 14.5,
        fontWeight: 700,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
        ...v[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ── field row ────────────────────────────────────────────────
 * A read-display or tappable field: white pill row with an optional leading
 * icon, a value, and an optional right-aligned mono tag or affordance.
 */
export function FieldRow({
  children,
  icon,
  right,
  active,
  height = 52,
  onClick,
  style,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  active?: boolean;
  height?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "rk-press" : undefined}
      style={{
        height,
        borderRadius: 16,
        background: C.card,
        border: active ? `1.5px solid ${C.green}` : `1px solid ${ink(0.14)}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
        ...style,
      }}
    >
      {icon}
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: C.ink }}>{children}</span>
      {right}
    </div>
  );
}

/* ── avatar ───────────────────────────────────────────────────── */
export function Avatar({
  initials,
  size = 36,
  ring,
  bg = C.avatar,
  color = C.ink,
  style,
}: {
  initials: string;
  size?: number;
  ring?: string | undefined;
  bg?: string;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        border: ring ? `2px solid ${ring}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.3),
        fontWeight: 700,
        color,
        flex: "none",
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

/* ── pitch canvas + player tokens ─────────────────────────────
 * The pitch is the interface. `variant` draws the markings; children are the
 * absolutely-positioned <PlayerToken> nodes.
 */
export function PitchCanvas({
  variant = "full",
  children,
  style,
}: {
  variant?: "full" | "top" | "split";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const line = "#FFFFFF";
  return (
    <div
      style={{
        position: "relative",
        background: variant === "split" ? "transparent" : C.pitch,
        borderRadius: 18,
        overflow: "hidden",
        ...style,
      }}
    >
      {variant === "split" && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "50%", background: green(0.09) }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", background: rust(0.08) }} />
        </>
      )}
      {/* outer box + halfway line + centre circle */}
      <div style={{ position: "absolute", inset: 14, border: `2px solid ${line}`, borderRadius: 8 }} />
      <div style={{ position: "absolute", left: 14, right: 14, top: "50%", height: 2, background: line }} />
      {variant === "split" ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 80,
            height: 80,
            border: `2px solid ${line}`,
            borderRadius: "50%",
            transform: "translate(-50%,-50%)",
            background: C.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: C.ink,
          }}
        >
          VS
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 80,
            height: 80,
            border: `2px solid ${line}`,
            borderRadius: "50%",
            transform: "translate(-50%,-50%)",
          }}
        />
      )}
      {/* penalty boxes */}
      {variant !== "split" && (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 14,
              transform: "translateX(-50%)",
              width: 150,
              height: 52,
              border: `2px solid ${line}`,
              borderTop: "none",
            }}
          />
          {variant === "full" && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: 14,
                transform: "translateX(-50%)",
                width: 150,
                height: 52,
                border: `2px solid ${line}`,
                borderBottom: "none",
              }}
            />
          )}
        </>
      )}
      {children}
    </div>
  );
}

type TokenTeam = "home" | "away" | "gold" | "muted" | "you";
export function PlayerToken({
  initials,
  name,
  team = "home",
  captain,
  dimmed,
  size = 46,
  filled,
  left,
  top,
  ring,
  style,
}: {
  initials: string;
  name?: string | undefined;
  team?: TokenTeam | undefined;
  captain?: boolean | undefined;
  dimmed?: boolean | undefined;
  size?: number | undefined;
  filled?: boolean | undefined; // solid fill (draft tokens) vs white with coloured border
  left?: string | number | undefined;
  top?: string | number | undefined;
  ring?: boolean | undefined; // selected halo
  style?: React.CSSProperties | undefined;
}) {
  const borderColor =
    team === "away" ? C.rust : team === "gold" ? C.gold : team === "muted" ? "#B6BDB4" : C.green;
  const solid = filled || team === "you";
  const circle: React.CSSProperties = solid
    ? {
        background: team === "away" ? C.rust : team === "you" ? C.ink : C.green,
        color: C.onDark,
        border: team === "you" ? `3px solid ${C.green}` : undefined,
      }
    : {
        background: C.card,
        color: C.ink,
        border: `3px solid ${borderColor}`,
      };
  return (
    <div
      style={{
        position: left != null ? "absolute" : undefined,
        left,
        top,
        transform: left != null ? "translate(-50%,-50%)" : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        opacity: dimmed ? 0.65 : 1,
        ...style,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          boxShadow: ring ? `0 0 0 4px ${team === "away" ? rust(0.3) : green(0.3)}` : undefined,
          ...circle,
        }}
      >
        {initials}
      </div>
      {name && (
        <span
          style={{
            fontSize: 9.5,
            fontWeight: captain ? 700 : 600,
            color: dimmed ? ink(0.5) : C.ink,
            whiteSpace: "nowrap",
          }}
        >
          {name}
          {captain ? " Ⓒ" : ""}
        </span>
      )}
    </div>
  );
}

/* ── rating segments (FUT-style 5-bar skill) ──────────────────── */
export function RatingSegments({
  label,
  value,
  max = 5,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, color: ink(0.55) }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: value >= max ? C.green : C.ink }}>
          {value}
        </span>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            onClick={onChange ? () => onChange(i + 1) : undefined}
            className={onChange ? "rk-press" : undefined}
            style={{
              flex: 1,
              height: 26,
              borderRadius: 8,
              background: i < value ? C.green : C.segEmpty,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Google-map placeholder card ──────────────────────────────
 * The turf location: a stylised map with a pin + "GOOGLE MAP" tag. No booking —
 * name + a Maps pin only, per the epic.
 */
export function MapCard({
  height = 130,
  action,
  style,
}: {
  height?: number;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${ink(0.12)}`,
        background: C.pitch2,
        position: "relative",
        height,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent 0 23px,rgba(16,21,17,.05) 23px 24px),repeating-linear-gradient(90deg,transparent 0 23px,rgba(16,21,17,.05) 23px 24px)",
        }}
      />
      <div style={{ position: "absolute", left: "-10%", top: "42%", width: "120%", height: 15, background: "rgba(255,255,255,.75)", transform: "rotate(-7deg)" }} />
      <div style={{ position: "absolute", left: "28%", top: "-10%", width: 10, height: "120%", background: "rgba(255,255,255,.6)", transform: "rotate(9deg)" }} />
      {/* pin */}
      <div style={{ position: "absolute", left: "50%", top: "48%", transform: "translate(-50%,-100%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.green, border: "3px solid #FFFFFF", boxShadow: "0 4px 10px rgba(16,21,17,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FFFFFF" }} />
        </div>
        <div style={{ width: 3, height: 9, background: C.green, borderRadius: "0 0 2px 2px" }} />
      </div>
      <span style={{ position: "absolute", left: 10, top: 10, fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: ink(0.5), background: "rgba(255,255,255,.85)", padding: "3px 8px", borderRadius: 8 }}>
        GOOGLE MAP
      </span>
      {action}
    </div>
  );
}

/* ── icons (only what the kit + screens use) ──────────────────── */
type IconName =
  | "pitch"
  | "rate"
  | "games"
  | "squad"
  | "kickoff"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "pin"
  | "search"
  | "share"
  | "copy"
  | "check"
  | "refresh"
  | "send"
  | "trash"
  | "x";

export function Icon({ name, size = 20, color = "currentColor", stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p: Record<IconName, React.ReactNode> = {
    pitch: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 12h16M12 4v16" />
      </>
    ),
    rate: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L2 9.3l6.1-.7L12 3z" />,
    games: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </>
    ),
    squad: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </>
    ),
    kickoff: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />,
    chevronLeft: <path d="M15 18l-6-6 6-6" />,
    chevronRight: <path d="M9 18l6-6-6-6" />,
    chevronDown: <path d="M6 9l6 6 6-6" />,
    pin: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21c4-4 7-7.6 7-11a7 7 0 10-14 0c0 3.4 3 7 7 11z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </>
    ),
    share: (
      <>
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
        <path d="M16 6l-4-4-4 4M12 2v13" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </>
    ),
    check: <path d="M20 6L9 17l-5-5" />,
    refresh: (
      <>
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" />
      </>
    ),
    send: <path d="M3 11l19-9-9 19-2-8-8-2z" />,
    trash: <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />,
    x: <path d="M18 6L6 18M6 6l12 12" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p[name]}
    </svg>
  );
}

/* ── bottom navigation ────────────────────────────────────────
 * Manager: 5 slots with a centre kickoff FAB. Player: 3 slots (no scheduling),
 * with an optional badge on Rate. Both float above the screen with a soft shadow.
 */
export type ManagerTab = "pitch" | "rate" | "games" | "squad";
export type PlayerTab = "pitch" | "rate" | "games";

function NavItem({ name, label, active, badge, onClick }: { name: IconName; label: string; active?: boolean; badge?: number | undefined; onClick?: (() => void) | undefined }) {
  return (
    <div
      onClick={onClick}
      className={onClick ? "rk-press" : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, position: "relative", color: active ? C.ink : ink(0.4) }}
    >
      <Icon name={name} size={20} />
      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{ position: "absolute", top: -4, right: -6, minWidth: 16, height: 16, padding: "0 3px", borderRadius: 8, background: C.rust, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

export function BottomNavManager({
  active = "pitch",
  onKickoff,
  onSelect,
  style,
}: {
  active?: ManagerTab;
  onKickoff?: () => void;
  onSelect?: (t: ManagerTab) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        margin: "12px 24px 24px",
        height: 64,
        borderRadius: 32,
        background: C.card,
        border: `1px solid ${ink(0.12)}`,
        boxShadow: "var(--rk-shadow-nav)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 26px",
        flex: "none",
        ...style,
      }}
    >
      <NavItem name="pitch" label="PITCH" active={active === "pitch"} onClick={onSelect && (() => onSelect("pitch"))} />
      <NavItem name="rate" label="RATE" active={active === "rate"} onClick={onSelect && (() => onSelect("rate"))} />
      <div
        onClick={onKickoff}
        className={onKickoff ? "rk-press" : undefined}
        style={{ width: 58, height: 58, borderRadius: "50%", background: C.green, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -26, boxShadow: "var(--rk-shadow-fab)", border: `4px solid ${C.surface}`, color: C.onDark, flex: "none" }}
        aria-label="Schedule a match"
      >
        <Icon name="kickoff" size={20} stroke={2.4} />
      </div>
      <NavItem name="games" label="GAMES" active={active === "games"} onClick={onSelect && (() => onSelect("games"))} />
      <NavItem name="squad" label="SQUAD" active={active === "squad"} onClick={onSelect && (() => onSelect("squad"))} />
    </div>
  );
}

export function BottomNavPlayer({
  active = "pitch",
  rateBadge,
  onSelect,
  style,
}: {
  active?: PlayerTab;
  rateBadge?: number;
  onSelect?: (t: PlayerTab) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        margin: "12px 24px 24px",
        height: 64,
        borderRadius: 32,
        background: C.card,
        border: `1px solid ${ink(0.12)}`,
        boxShadow: "var(--rk-shadow-nav)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 20px",
        flex: "none",
        ...style,
      }}
    >
      <NavItem name="pitch" label="PITCH" active={active === "pitch"} onClick={onSelect && (() => onSelect("pitch"))} />
      <NavItem name="rate" label="RATE" active={active === "rate"} badge={rateBadge} onClick={onSelect && (() => onSelect("rate"))} />
      <NavItem name="games" label="GAMES" active={active === "games"} onClick={onSelect && (() => onSelect("games"))} />
    </div>
  );
}

/* a back-chevron screen header (Create / Schedule / Join) */
export function ScreenHeader({
  title,
  onBack,
  right,
  style,
}: {
  title: React.ReactNode;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", gap: 12, ...style }}>
      {onBack && (
        <div
          onClick={onBack}
          className="rk-press"
          style={{ width: 38, height: 38, borderRadius: 12, background: C.card, border: `1px solid ${ink(0.14)}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink, flex: "none" }}
          aria-label="Back"
        >
          <Icon name="chevronLeft" size={16} stroke={2.4} />
        </div>
      )}
      <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: C.ink }}>{title}</span>
      {right != null && <span style={{ marginLeft: "auto" }}>{right}</span>}
    </div>
  );
}
