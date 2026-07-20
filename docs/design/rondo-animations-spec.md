# Rondo — Motion & Gesture implementation spec

Approved from the demo (`scratchpad/rondo-animations-demo.html`, published
2026-07-20). Goal: bring the demo's animation vocabulary into the real v5 app
**without changing any navigation or data behaviour** — motion is an *additive
presentational layer* (wrappers + CSS), so every existing feature keeps working.

## Principles
- **Additive & opt-in.** Motion is delivered through wrapper components and CSS
  classes. Handlers (`onClick`, `nav`, `onClose`, VM actions) are passed through
  untouched. No screen's logic is rewritten.
- **Transform/opacity only.** Never animate layout properties. GPU-friendly.
- **Spring easing.** `cubic-bezier(.22,1,.36,1)`, durations 180–320ms.
- **Reduced motion.** Every animation is gated on
  `@media (prefers-reduced-motion: reduce)` → no transform/opacity transitions,
  instant state (gestures still work, just without the follow-animation).
- **Pointer, not touch-only.** Gestures use Pointer Events so they work with
  mouse + touch.

## Primitives (in `components/rondo/v5/kit5.tsx` or a new `anim5.tsx`)
1. **`Pressable`** — wraps any tappable; adds `scale(.96)` spring on pointer-down,
   springs back on up/leave/cancel. Passes through `onClick`, `style`, children.
   Applied to dock items, primary buttons, cards, chips, sheet actions.
2. **`ScreenTransition`** — wraps app5's body. On `screenKey` change, the outgoing
   screen shifts left + dims (parallax) while the incoming slides in from the
   right; **pop** reverses (out-screen from left). Direction from a push/pop
   hint. Pure CSS keyframes keyed on the screen id; the state machine in app5 is
   unchanged — it just renders one extra child per transition.
3. **`useSwipeBack(onBack)`** — a hook returning pointer handlers for an
   edge-drag-to-pop gesture: a drag started within ~24px of the left edge tracks
   the finger (screen follows), releasing past ~35% width (or fast flick) calls
   `onBack()`, else snaps back. Attached to detail/push screens that have a back
   target.
4. **`Sheet` enhancement** — the existing bottom sheet gains: spring-up open with
   slight overshoot + backdrop fade, and **drag-the-grab-handle-down-to-dismiss**
   (follows finger, snaps to open or calls `onClose` past threshold). API
   unchanged (`open`/`onClose`).
5. **`DockNav` enhancement** — tab switch cross-slides the *content* (handled by
   ScreenTransition) and the tapped icon does a subtle pop/scale; badge dots
   animate in. API unchanged.
6. **`Stagger` / `.rk5-stagger`** — a container helper that fades+rises children
   with an incremental delay on mount. Applied to the match list, squad list,
   chat feed entrance.
7. **`useCountUp(value)`** + **`ProgressBar` easing** — numbers (poll votes,
   OVR, N/M rated, stat tiles) count up on change; progress fills ease width.
   Purely visual; the underlying value is the source of truth.
8. **`Toast` enhancement** — spring-up entrance + fade-out (refines `useToast`).
9. **`NightPitch` token settle** — on mount / when teams change, tokens animate
   from the centre (or a slight offset) to their slots with a staggered spring.
   Read-only visual; positions from `placeDraft` unchanged.

## Integration
- `app5.tsx`: wrap the rendered `body` in `ScreenTransition` keyed on `screen`;
  maintain a tiny push/pop direction hint (forward when navigating to a
  param/deeper screen, back when returning to a dock tab or via swipe-back);
  attach `useSwipeBack` on screens with a back affordance (mdetail, pdetail,
  edit, pview, wizard). Dock `onSelect` unchanged.
- Wrap interactive elements in `Pressable` where it reads as tappable (do NOT
  change their handlers). Apply `.rk5-stagger` to the main lists.
- Keep everything typechecking and every existing screen reachable.

## Out of scope / careful
- No new screens, no route changes, no VM/SDK/backend changes.
- Pull-to-refresh is **optional** (the app already polls every ~8s); include a
  lightweight version on the home/squad lists only if it doesn't complicate the
  scroll containers — otherwise skip and note it.
- Do not regress the static bottom dock or scroll behaviour.

## Verification
Full app `tsc --noEmit` 0 errors; lint clean; every screen still renders and
every action still fires (a reviewer pass confirms no handler was dropped and
`prefers-reduced-motion` disables the motion).
