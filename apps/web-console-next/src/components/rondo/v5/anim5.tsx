/*
 * Rondo v5 — motion & gesture layer (docs/design/rondo-animations-spec.md).
 *
 * A purely ADDITIVE presentational layer: wrapper components + a single
 * injected <style> block of keyframes. Nothing here fetches data, touches the
 * VM, or changes navigation — every primitive passes the caller's handlers
 * (onClick / onBack / …) straight through. The vocabulary (spring easing,
 * timings, gesture feel) is reimplemented from the approved vanilla-JS demo
 * (scratchpad/rondo-animations-demo.html) in React 19.
 *
 * All motion is gated on `prefers-reduced-motion: reduce` — CSS-driven motion
 * collapses via the media query in `Anim5Styles`, JS-driven motion (count-up,
 * swipe-follow) checks `useReducedMotion()` and jumps to the end state while
 * the gesture itself keeps working.
 *
 * Transform/opacity only — layout properties are never animated.
 */
"use client";

import * as React from "react";

/** The house spring curve — a slight overshoot baked into the bezier itself
 *  (matches the demo's `--ease`). Durations stay in the 180–320ms band. */
export const EASE = "cubic-bezier(.22,1,.36,1)";

/* ── reduced-motion ───────────────────────────────────────────────────── */

/** Live `prefers-reduced-motion: reduce` state. SSR-safe: starts `false`
 *  (matching the server render) and updates after mount, so JS-driven motion
 *  can opt out without a hydration mismatch. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/* ── keyframes / class registry ───────────────────────────────────────── */

/** The one small CSS block the whole v5 motion layer needs. The v5 kit is
 *  otherwise style-literal only (no CSS modules), so — like the demo — the
 *  keyframes live in a single <style> tag rendered once near the app root
 *  (see app5.tsx). Static text: identical on server + client, no hydration
 *  risk. The reduced-motion media query collapses every CSS-driven duration. */
export function Anim5Styles() {
  return <style dangerouslySetInnerHTML={{ __html: ANIM5_CSS }} />;
}

const ANIM5_CSS = `
.rk5-pressable{ -webkit-tap-highlight-color: transparent; touch-action: manipulation; transition: transform 160ms ${EASE}; }
.rk5-screen{ position:absolute; inset:0; }
@keyframes rk5-enter-fwd{ from{ transform: translateX(100%); } to{ transform: translateX(0); } }
@keyframes rk5-exit-fwd{ from{ transform: translateX(0); opacity:1; } to{ transform: translateX(-28%); opacity:.55; } }
@keyframes rk5-enter-back{ from{ transform: translateX(-28%); opacity:.55; } to{ transform: translateX(0); opacity:1; } }
@keyframes rk5-exit-back{ from{ transform: translateX(0); } to{ transform: translateX(100%); } }
.rk5-enter-forward{ animation: rk5-enter-fwd 300ms ${EASE} both; z-index:2; }
.rk5-exit-forward{ animation: rk5-exit-fwd 300ms ${EASE} both; z-index:1; }
.rk5-enter-back{ animation: rk5-enter-back 300ms ${EASE} both; z-index:1; }
.rk5-exit-back{ animation: rk5-exit-back 300ms ${EASE} both; z-index:2; }
@keyframes rk5-rise{ from{ opacity:0; transform: translateY(12px); } to{ opacity:1; transform: none; } }
.rk5-rise{ animation: rk5-rise 380ms ${EASE} both; }
@keyframes rk5-badge-pop{ from{ transform: scale(0); } to{ transform: scale(1); } }
.rk5-badge-pop{ animation: rk5-badge-pop 300ms ${EASE} both; }
.rk5-sheet{ transition: transform 380ms ${EASE}; }
.rk5-sheet-backdrop{ transition: opacity 300ms ${EASE}; }
.rk5-toast{ transition: transform 320ms ${EASE}, opacity 320ms ${EASE}; }
.rk5-bar{ transition: transform 700ms ${EASE}; }
@media (prefers-reduced-motion: reduce){
  .rk5-pressable,
  .rk5-enter-forward, .rk5-exit-forward, .rk5-enter-back, .rk5-exit-back,
  .rk5-rise, .rk5-badge-pop, .rk5-sheet, .rk5-sheet-backdrop, .rk5-toast, .rk5-bar{
    animation-duration: .001ms !important;
    animation-delay: 0ms !important;
    transition-duration: .001ms !important;
  }
}
`;

/* ── #6 Pressable ─────────────────────────────────────────────────────── */

export interface PressableProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement> | undefined;
  style?: React.CSSProperties | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  title?: string | undefined;
}

/** Wraps any tappable element in a `scale(.96)` spring on pointer-down that
 *  springs back on up/leave/cancel. A drop-in replacement for a plain
 *  `<div onClick style>` tap target — the exact same `onClick`/`style` pass
 *  through, so no handler is altered. Never swallows the click. */
export function Pressable({ children, onClick, style, disabled, className, title }: PressableProps) {
  const [pressed, setPressed] = React.useState(false);
  const release = React.useCallback(() => setPressed(false), []);
  const press = React.useCallback(() => {
    if (!disabled) setPressed(true);
  }, [disabled]);

  return (
    <div
      className={className ? `rk5-pressable ${className}` : "rk5-pressable"}
      onClick={disabled ? undefined : onClick}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      {...(title !== undefined ? { title } : {})}
      style={{ transform: pressed ? "scale(0.96)" : undefined, ...style }}
    >
      {children}
    </div>
  );
}

/* ── #1/#4 ScreenTransition ───────────────────────────────────────────── */

export type NavDirection = "forward" | "back";

interface Outgoing {
  key: string;
  node: React.ReactNode;
  dir: NavDirection;
}

/** Wraps app5's rendered body. On `screenKey` change the incoming screen
 *  slides in (from the right on `forward`, the left on `back`) while the
 *  outgoing screen parallax-shifts the other way and dims. Both layers only
 *  coexist for the ~300ms transition; then the outgoing layer unmounts.
 *
 *  The app's screen state machine is untouched — this renders at most one
 *  extra (frozen) child during a transition. Layer keys reuse the screen id so
 *  the outgoing screen keeps its fiber (state + scroll) while it animates out. */
export function ScreenTransition({
  screenKey,
  direction,
  children,
}: {
  screenKey: string;
  direction: NavDirection;
  children: React.ReactNode;
}) {
  const [outgoing, setOutgoing] = React.useState<Outgoing | null>(null);
  const keyRef = React.useRef(screenKey);
  const nodeRef = React.useRef<React.ReactNode>(children);

  // Derive the transition during render (no post-paint flash): when the key
  // changes, snapshot the previous screen as the outgoing layer, then adopt
  // the new key. Guarded by the ref, so this fires exactly once per change.
  if (screenKey !== keyRef.current) {
    setOutgoing({ key: keyRef.current, node: nodeRef.current, dir: direction });
    keyRef.current = screenKey;
  }
  nodeRef.current = children;

  React.useEffect(() => {
    if (!outgoing) return;
    const t = setTimeout(() => setOutgoing(null), 340);
    return () => clearTimeout(t);
  }, [outgoing]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {outgoing && (
        <div key={`scr-${outgoing.key}`} className={`rk5-screen rk5-exit-${outgoing.dir}`}>
          {outgoing.node}
        </div>
      )}
      <div key={`scr-${keyRef.current}`} className={outgoing ? `rk5-screen rk5-enter-${outgoing.dir}` : "rk5-screen"}>
        {children}
      </div>
    </div>
  );
}

/* ── #2 useSwipeBack ──────────────────────────────────────────────────── */

interface SwipeState {
  active: boolean;
  startX: number;
  startY: number;
  decided: boolean;
  horiz: boolean;
  width: number;
  pointerId: number;
  lastX: number;
  lastT: number;
  vx: number;
}

export interface SwipeBackBinding {
  handlers: {
    onPointerDown: React.PointerEventHandler<HTMLDivElement>;
    onPointerMove: React.PointerEventHandler<HTMLDivElement>;
    onPointerUp: React.PointerEventHandler<HTMLDivElement>;
    onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  };
  /** Spread onto the screen container: the live drag transform (idle → no
   *  transform, so fixed-position descendants elsewhere are unaffected). */
  style: React.CSSProperties;
}

const EDGE_PX = 24;
const COMMIT_FRACTION = 0.35;
const FLICK_VX = 0.5; // px/ms

/** iOS-style interactive edge-drag-to-pop. A drag that starts within 24px of
 *  the left edge tracks the finger (the screen follows); releasing past 35% of
 *  the width — or on a fast flick — calls `onBack()`, otherwise it snaps back.
 *  `onBack` is the caller's existing back navigation, called verbatim. When
 *  `enabled` is false the handlers no-op. Under reduced motion the follow
 *  transform is suppressed but the gesture still commits. */
export function useSwipeBack(onBack: () => void, enabled: boolean): SwipeBackBinding {
  const reduced = useReducedMotion();
  const [dx, setDx] = React.useState(0);
  const [settling, setSettling] = React.useState(false);
  const st = React.useRef<SwipeState>({
    active: false,
    startX: 0,
    startY: 0,
    decided: false,
    horiz: false,
    width: 0,
    pointerId: -1,
    lastX: 0,
    lastT: 0,
    vx: 0,
  });

  React.useEffect(() => {
    if (!settling) return;
    const t = setTimeout(() => setSettling(false), 320);
    return () => clearTimeout(t);
  }, [settling]);

  const onPointerDown = React.useCallback<React.PointerEventHandler<HTMLDivElement>>(
    (e) => {
      if (!enabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX - rect.left > EDGE_PX) return;
      const now = e.timeStamp || performance.now();
      st.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        decided: false,
        horiz: false,
        width: rect.width || 1,
        pointerId: e.pointerId,
        lastX: e.clientX,
        lastT: now,
        vx: 0,
      };
      setSettling(false);
    },
    [enabled],
  );

  const onPointerMove = React.useCallback<React.PointerEventHandler<HTMLDivElement>>((e) => {
    const s = st.current;
    if (!s.active) return;
    const ddx = e.clientX - s.startX;
    const ddy = e.clientY - s.startY;
    if (!s.decided) {
      if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) {
        s.decided = true;
        s.horiz = Math.abs(ddx) > Math.abs(ddy);
        if (s.horiz) {
          try {
            e.currentTarget.setPointerCapture(s.pointerId);
          } catch {
            /* capture is best-effort */
          }
        }
      } else {
        return;
      }
    }
    if (!s.horiz) return;
    const now = e.timeStamp || performance.now();
    const dt = now - s.lastT;
    if (dt > 0) s.vx = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX;
    s.lastT = now;
    const clamped = Math.max(0, ddx);
    if (!reduced) setDx(clamped);
  }, [reduced]);

  const finish = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = st.current;
      if (!s.active) return;
      s.active = false;
      const ddx = Math.max(0, e.clientX - s.startX);
      const commit = s.horiz && (ddx > s.width * COMMIT_FRACTION || (s.vx > FLICK_VX && ddx > 24));
      setSettling(true);
      setDx(0);
      if (commit) onBack();
    },
    [onBack],
  );

  const dragging = st.current.active && st.current.horiz;

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish },
    style: {
      transform: dragging || settling ? `translateX(${dx}px)` : undefined,
      transition: dragging ? "none" : settling ? `transform 300ms ${EASE}` : undefined,
    },
  };
}

/* ── #5 Stagger ───────────────────────────────────────────────────────── */

/** Fades + rises its direct children with an incremental delay on mount
 *  (list entrance). Each child is wrapped in a lightweight animated box, so
 *  drop it around a `.map(...)` inside an existing flex-column/gap list and
 *  the gap still lands between rows. Re-runs whenever the list remounts (i.e.
 *  on screen entry), not on in-place data updates. */
export function Stagger({
  children,
  step = 45,
  style,
}: {
  children: React.ReactNode;
  step?: number;
  style?: React.CSSProperties | undefined;
}) {
  const items = React.Children.toArray(children);
  return (
    <>
      {items.map((child, i) => {
        // Prefer the child's own key so wrapper identity is stable across
        // reorders/prepends (id-keyed lists, e.g. the chat feed) — the rise
        // animation then plays on true mount only, not on in-place updates.
        const key = React.isValidElement(child) && child.key != null ? child.key : i;
        // Cap the cascade so a long list (e.g. a big chat feed) doesn't delay
        // its last rows by seconds — the first ~10 stagger, the rest ride in together.
        const delay = Math.min(i, 10) * step;
        return (
          <div key={key} className="rk5-rise" style={{ animationDelay: `${delay}ms`, ...style }}>
            {child}
          </div>
        );
      })}
    </>
  );
}

/* ── #7 useCountUp / CountUp ───────────────────────────────────────────── */

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** Eases a number toward `value`: from 0 on first mount, then from the prior
 *  value on change (easeOutCubic, ~650ms). Visual only — `value` stays the
 *  source of truth; reduced motion returns it verbatim. */
export function useCountUp(value: number, duration = 650): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(0);
  const mountedRef = React.useRef(false);
  const rafRef = React.useRef(0);

  useIsoLayoutEffect(() => {
    const from = mountedRef.current ? fromRef.current : 0;
    mountedRef.current = true;
    if (reduced || from === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    setDisplay(from);
    let start = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const frame = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      setDisplay(Math.round(from + (value - from) * ease(t)));
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, reduced, duration]);

  return display;
}

/** Inline count-up for a single number (stat tiles, OVR, vote tallies). */
export function CountUp({ value, duration }: { value: number; duration?: number | undefined }) {
  const n = useCountUp(value, duration);
  return <>{n}</>;
}
