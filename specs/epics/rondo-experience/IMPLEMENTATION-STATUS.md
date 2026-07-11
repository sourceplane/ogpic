# Implementation Status — rondo-experience

> Trust code reality over this doc. Where this file and the running system
> disagree, the system is the source of truth and this file is the bug.

## Summary

| ID | Status | Notes |
|----|--------|-------|
| RX0 | **Built (front-end)** | Rondo design system (`rondo.css` scoped tokens/motion, self-hosted Archivo + JetBrains Mono via next/font) + primitives (FUT card, bottom sheet, avatar, mono label, icon chip) + responsive `AppShell` (phone-on-desktop / full-bleed mobile) + `SQUAD·VOTE·PLAY·FEED·FIXTURES` bottom nav |
| RX1 | **Built (front-end)** | Login + Join screens |
| RX2 | **Built (UI, seed data)** | Squad home + team-switcher sheet — live-data wiring pending |
| RX3 | **Built (UI, local state)** | Rate teammates + vote sheet (per-skill stars) — backend voting slice pending |
| RX4 | **Built (UI, local state)** | Availability + Play with live client-side balance + tap-to-swap — backend availability slice + server `/draft` wiring pending |
| RX5 | **Built (UI, local state)** | Live match: scoreboard, goals, scorer sheet, timeline, MOTM — backend events slice pending |
| RX6 | **Built (UI, seed data)** | Fixtures schedule + results — live matches API wiring pending |
| RX7 | **Built (UI, local state)** | Manage squad: invite code, pending requests, members & roles — membership API wiring pending |
| RX8 | **Built (UI, seed data)** | Community: leaderboard + feed — backend points/feed slice pending |
| RX9 | Partial | Responsive mobile + desktop-framed done; wide multi-column desktop, a11y focus pass, and Cmd-K registration pending |
| RX10 | Partial | Build + typecheck + lint green; Playwright screenshot walkthrough (mobile + desktop) captured; pixel-diff + prod smoke pending |

## As-built (increment 1 — front-end product)

The **complete Rondo experience** ships as a self-contained, token-free route
`/rondo` (standalone, like `/demo`), running the full product loop on the seed
roster so it is demoable and pixel-verifiable **without a backend**. This is the
front-end half of RX0–RX8; the additive backend slices (voting→OVR, availability,
live scoring, community points) and their live-data wiring are the next
increments (design.md §6).

Files (`apps/web-console-next/`):

- **`src/styles/rondo.css`** — scoped `--r-*` design tokens (surfaces, text,
  accent, position + tier palettes), `r-rise`/`r-pop`/`r-sheet` keyframes (behind
  `prefers-reduced-motion`), and the responsive stage/frame (full-bleed <768px,
  centered 390×844 device frame ≥768px). Namespaced under `.rondo-root` so it
  never touches platform surfaces (R6).
- **`src/app/rondo/layout.tsx`** — self-hosts Archivo + JetBrains Mono via
  `next/font/google` (CSP-safe, no runtime external fetch).
- **`src/app/rondo/page.tsx`** — the route.
- **`src/components/rondo/logic.ts`** — types, seed roster, `tierOf`/`posColor`/
  `shortName`/`initials`, and the pure `balance()` draft (ported from the
  prototype; server engine `matchmaker-worker/engine/balance.ts` is the
  authoritative version).
- **`src/components/rondo/use-rondo.ts`** — the prototype state machine +
  computed view-model as a React hook (deterministic ids; no `Date.now`/`random`).
  Accepts a `RondoSeed` so live roster/team data drops in later.
- **`src/components/rondo/ui.tsx`** — `StatusBar`, `BottomSheet`, `Avatar`,
  `IconChip`, `Mono`.
- **`src/components/rondo/player-card.tsx`** — the FUT card.
- **`src/components/rondo/screens.tsx`** — all nine screens.
- **`src/components/rondo/rondo-app.tsx`** — shell + bottom nav + the three
  overlays (team switcher, vote sheet, scorer sheet) + screen routing.

## Verification record (increment 1)

- `next build` — compiles; `/rondo` route 15.1 kB / 115 kB first load.
- `tsc --noEmit` — clean. `eslint src/components/rondo src/app/rondo` — clean.
- Playwright walkthrough (headless Chromium) at **390×844** across the full loop
  (login → squad → vote + vote sheet → play → draft/balance → start match →
  goal/scorer → timeline → community → fixtures) and at **1280** desktop (framed
  device view): **zero console/page errors**; screenshots confirm pixel-close
  match to the prototype including Archivo display type, tier-graded FUT cards,
  the balance meter, and the bottom nav.

## Per-screen pixel deviation log

- All screens — lucide-react icons stand in for the prototype's hand-authored
  inline SVGs (same 22/18/16px sizes, stroke style); visually equivalent, chosen
  for maintainability.
- Avatars use the prototype's hatched-disc placeholder (no real member photos in
  the seed) — matches the source, which is also photo-less.

## Open follow-ups

- Wire live data into RX2/RX6 (roster + fixtures over `useSession().client`) and
  add the additive backend slices for RX3/RX4/RX5/RX8 (design.md §6),
  coordinated with `../matchmaker/design.md` so the context is not forked (R2).
- RX9: wide multi-column desktop layouts, `:focus-visible` + keyboard pass,
  Cmd-K + org-nav registration once /rondo is promoted into org scope.
- Answer the open questions in `risks-and-open-questions.md` (Q2/Q6 before the
  voting/availability backend; Q1/Q5 before default-theme + desktop theming).
