# Implementation Status — rondo-experience

> Trust code reality over this doc. Where this file and the running system
> disagree, the system is the source of truth and this file is the bug.

## Summary

| ID | Status | Notes |
|----|--------|-------|
| RX0 | **Built (front-end)** | Rondo design system (`rondo.css` scoped tokens/motion, self-hosted Archivo + JetBrains Mono via next/font) + primitives (FUT card, bottom sheet, avatar, mono label, icon chip) + responsive `AppShell` (phone-on-desktop / full-bleed mobile) + `SQUAD·VOTE·PLAY·FEED·FIXTURES` bottom nav |
| RX1 | **Live auth + team creation** | `/rondo` is the real entry gate: Rondo-branded sign-in/sign-up over the platform's unified auth — one-tap **Google** (OAuth, shown when configured) + email code — with `/rondo/callback` for the OAuth return. Signed-in users route to their squad; those with no team go to `/rondo/new` (**create team** → `client.organizations.create`, creator = manager/owner). Token-free preview moved to `/rondo/demo`. |
| RX2 | **Built + roster live-wired** | Squad home + team-switcher sheet; the authenticated `/rondo/[orgSlug]` route loads the org's **real roster** over `client.roster.list` and feeds the same app. Draft/fixtures live-wiring + real team switcher pending |
| RX3 | **Voting live → dynamic OVR** | Rate teammates + vote sheet (per-skill 1-5 stars) now persist via `client.roster.castVotes`. A player's published overall rating blends the manager-authored baseline (`computeOvr(attributes)`) with the community star average — the baseline weighted as `VOTE_PRIOR` pseudo-votes, so a player with no votes keeps their baseline and each vote nudges (never overwrites). The blended rating shows on the card and drives the draft balance. Backend slice `240_matchmaker_player_votes` (migration + `player_votes` table + repo + engine `effectiveRating` + GET/POST `/players/:id/votes` + policy `organization.player.vote` for all member roles + edge + SDK + CLI + tests) |
| RX4 | **Live** | Availability backend slice shipped **and wired**: the `/rondo/[orgSlug]` route loads live availability, persists cycles via `client.availability.set`, and the Play "Draft" button runs the real server `/draft` endpoint (falls back to the deterministic local split if unavailable). Fixtures recent-results read live via `client.fixtures.list`. Fixture creation (schedule) is the next increment |
| RX5 | **Built (UI, local state)** | Live match: scoreboard, goals, scorer sheet, timeline, MOTM — backend events slice pending |
| RX6 | **Built (UI, seed data)** | Fixtures schedule + results — live matches API wiring pending |
| RX7 | **Captain live end-to-end** | Manage squad UI wired to live roster: **set captain** (`client.roster.setCaptain`, exactly one per org) and **release** (`client.roster.release`) with optimistic updates; the captain is surfaced on the Squad card and as a Ⓒ badge on the FUT card. Backend slice `220_matchmaker_captain` (migration + `PUT /players/:id/captain` + SDK + CLI + tests). Org-member role changes (`client.memberships.updateMemberRole`) + add-player dialog remain follow-ups |
| RX7b | **Join-by-code live** | Self-serve membership: a manager shares the squad's **join code** (`client.memberships.getJoinCode`, lazily minted, rotatable), a signed-in player requests to join at `/rondo/join` (`client.memberships.join({code})`, cross-org), and the manager approves/declines from *Manage squad* (`approveJoinRequest`/`declineJoinRequest`, approval mints member + role assignment). Backend slice `230_membership_join_requests` (migration + policy `organization.join_code.*` / `organization.join_request.*` → owner+admin + handlers + edge + SDK + CLI + tests) |
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
