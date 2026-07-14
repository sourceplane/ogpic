# Epic A — Content-only UI (drop the phone-mockup chrome)

> **Status:** Proposed — awaiting verification. No code changed yet.

## Why

The design canvas draws each screen inside a phone with an iOS status bar
(`9:41` + signal/battery). That is **illustration** — a way to show the app on a
device. The actual product UI is the **content**. The current build renders that
fake status bar on every screen; it should not ship.

## What changes

1. **Remove the fake status bar.** Delete the `9:41` + signal/battery row
   (`StatusBar` in `components/rondo/kit.tsx`) from every screen (login, start,
   create, join, manager home/schedule/draft/squad, player home/rate/games).
2. **Respect the real device instead.** Replace it with a safe-area top spacer
   (`env(safe-area-inset-top)`, with a small minimum) so content never hides
   under the phone's *real* status bar — but we draw no clock or battery.
3. **Desktop presentation (needs your call).** Today desktop shows the content in
   a rounded 390-wide "phone" frame. Two options — pick one:
   - **A. Content-only, centered column** (no phone bezel) — matches "the actual
     UI is the content". *Recommended.*
   - **B. Keep a subtle framed phone** purely as a desktop container.

## Out of scope

Any content/layout redesign (that's Epic B rollout / future design passes). This
epic only strips the mockup chrome.

## Definition of done

No screen renders a fake clock/battery; content sits correctly under the real
status bar on device and reads as a normal app on desktop; typecheck · lint ·
`next build` · CI green.

## Verify checklist (for you)

- [ ] Remove the `9:41` + battery bar everywhere — yes?
- [ ] Desktop: content-only column (A) or keep the phone frame (B)?
