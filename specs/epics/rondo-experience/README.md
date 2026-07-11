# Epic: rondo-experience

**Rebuild the entire product surface as _Rondo_ — a mobile-first football
community app — and grow the matchmaker domain into the social loop the design
implies.** The seed for this epic is the `Rondo — Football Matcher` prototype
(`specs/epics/rondo-experience/design-reference.md`): a fully-designed, ten-screen
mobile app with a distinct dark visual identity (green accent, `Archivo` +
`JetBrains Mono`, FUT-style tier cards) and a complete product loop —
**join a squad → rate teammates → set availability → auto-balance sides → play &
score live → schedule fixtures → climb the community table.** This epic takes the
console from a desktop-first admin surface with three matchmaker pages to that
full experience, **pixel-matched** and **fully responsive** (one codebase, native
on phones, framed and widened on desktop).

## Status

| Field | Value |
|-------|-------|
| Status | **In progress** (front-end of RX0–RX8 built as the demoable `/rondo` route; additive backend slices + live-data wiring + RX9/RX10 next) |
| Cluster | **RX** (RX0–RX10) — the product-experience revamp; extends **U** (design system) and **MM** (matchmaker product) |
| Owner(s) | `apps/web-console-next`, `packages/ui`, `apps/matchmaker-worker`, `apps/api-edge`, `packages/{contracts,db,sdk,cli,policy-engine}` |
| Target branch | `main` (developed on `claude/ui-revamp-epic-nphrcb`) |
| Builds on | MM1–MM4 (roster/draft/fixtures backend + console), U1–U11 (App Router, design system, Cmd-K, empty/skeleton states), B1 identity/membership, the policy engine |
| Design source | `design-reference.md` (extracted from the `Rondo — Football Matcher` prototype); tokens + per-screen spec in `design.md` |
| Decisions locked | Rondo replaces the amber "photography" theme as the console's default brand; mobile-first responsive (no separate app); the org **is** the squad; peer voting, availability, live scoring, and community points are **new** additive backend slices sequenced behind the UI they serve; no destructive change to platform/settings surfaces (they inherit the new design system, not the football chrome) |

## Thesis

The matchmaker epic (MM) lifted a toy draft engine onto real tenancy and API
rails and gave it three competent desktop console pages (MM4). The Rondo
prototype shows where that product actually wants to live: **on a phone, in the
hands of everyone in the squad, every week.** It is not a re-skin of three
tables — it is a different product shape:

- **A loop, not a dashboard.** Rate → available → draft → play → score → feed.
  Each screen hands off to the next; the bottom nav (`SQUAD · VOTE · PLAY · FEED
  · FIXTURES`) is the product, not a menu.
- **Ratings come from the community, not an admin.** The OVR that drives
  balancing is the settled result of peer votes (1–5 stars per skill) — the
  design's headline feature and a genuinely new backend capability the MM epic
  explicitly deferred.
- **The identity is the design.** Dark carbon, one green accent, black `Archivo`
  numerals, tier-graded FUT cards, `JetBrains Mono` micro-labels, bottom-sheet
  overlays. Buyer credibility here is _visual fidelity_, so this epic holds a
  **pixel-match** bar against the prototype, not just "uses the design system".

So the work is two interlocking tracks that ship together per screen: a
**design-system track** (RX0 tokens + primitives + responsive app shell) and a
**product track** (voting, availability, live match, community points) that turns
each pixel-matched screen into a live, backed feature. Platform/admin surfaces
(billing, settings, audit, projects) are **not** re-chromed into a football app —
they inherit the refreshed design tokens and the responsive shell, and nothing
more, so the revamp never regresses the SaaS baseline.

This is deliberately the **largest coherent UI unit** in the roadmap: it retires
the "backend-ahead-of-surface" gap for matchmaker and sets the visual bar every
future product area copies.

## Read order

1. `README.md` (this file) — charter, scope, sequencing.
2. `design.md` — the design system (tokens, type, color, motion, the
   phone-frame-on-desktop responsive model) and the per-screen pixel spec.
3. `design-reference.md` — the extracted prototype: exact hex, spacing, and the
   reference state machine + balancing/voting logic, screen by screen.
4. `implementation-plan.md` — RX0–RX10 with "done when" acceptance criteria.
5. `risks-and-open-questions.md` — the new-trust-path and scope decisions.
6. `test-plan.md` — the pixel-match, responsive, and functional verification bar.
7. `IMPLEMENTATION-STATUS.md` — as-built record (populated as milestones land).

## Milestones at a glance

| ID | Milestone | Track | Status |
|----|-----------|-------|--------|
| RX0 | **Design system + responsive app shell.** Rondo tokens in `packages/ui`/`globals.css` (green accent, `Archivo`/`JetBrains Mono`, tier + position palettes, motion keyframes); pixel-matched primitives (FUT card, stat tile, mono-label, bottom sheet, segmented control, star rating, availability pill); the phone-frame-on-desktop / full-bleed-on-mobile shell + `SQUAD·VOTE·PLAY·FEED·FIXTURES` bottom nav. | Design | **Ready** |
| RX1 | **Auth & onboarding.** Login (phone/Apple/Google/demo squad) + Join-squad (invite-code entry, squad link, recent invites) on the new shell, wired to the existing session/invite flow. | Design | Planned |
| RX2 | **Squad home.** Team switcher header + multi-squad sheet (existing multi-org membership), season record, Rondo-points/rank/streak, manager+captain, availability CTA, and the FUT roster grid over the live roster API. | Design + Product | Planned |
| RX3 | **Rate teammates (voting).** New backend slice: per-skill 1–5 star peer votes with a settling window that recomputes each player's OVR; vote screen + bottom-sheet rating UI; OVR provenance becomes "community-settled". | Product | Planned |
| RX4 | **Availability + Play (draft).** New availability slice (in/maybe/out per member per fixture window); team-size segmented control; auto-balance over available players (live `POST /draft`); tap-to-swap; re-draft; start/schedule. | Product | Planned |
| RX5 | **Live match.** New live-scoring slice: scoreboard, home/away goals, scorer picker, event timeline, Man-of-the-Match; end → persists final score + timeline snapshot to the fixture. | Product | Planned |
| RX6 | **Fixtures.** Schedule flow (date/kick-off/turf picker) + recent-results list over the live matches API, pixel-matched to the prototype. | Design + Product | Planned |
| RX7 | **Manage squad (members).** Invite code + copy/share link, add-by-id, pending join requests (accept/decline), members & roles list with remove — over membership + invitations APIs and RBAC. | Design + Product | Planned |
| RX8 | **Community.** New community slice: Rondo-points ledger, local leaderboard, and the activity feed (results, MOTM, news) with "validated"/points tags. | Product | Planned |
| RX9 | **Desktop adaptation, theming & a11y.** Multi-column desktop layouts, white-label theme swap (Rondo is one theme, not a fork), full keyboard/reduced-motion/contrast pass, Cmd-K registration for every new surface. | Design | Planned |
| RX10 | **Verification & polish.** Pixel-diff against the prototype, responsive matrix (360→1440), authenticated Playwright walkthrough of the full loop, prod smoke. | — | Planned |

## Scope boundary

| In scope | Out of scope |
|----------|--------------|
| Full Rondo visual system in `packages/ui` (tokens, primitives) applied across the console; the ten product screens pixel-matched and responsive; new additive backend slices for **voting → OVR**, **availability**, **live match scoring**, and **community points/leaderboard/feed**; multi-squad switching over existing multi-org membership; RBAC additions for the new actions; full SDK/CLI parity for every new route | Rewriting identity/tenancy ownership; turning platform/admin surfaces (billing, projects, config, audit, webhooks, admin) into football-themed screens (they take the token refresh + responsive shell only); native iOS/Android apps (this is a responsive web app); public unauthenticated squad pages / cross-squad "public friendlies" (prototype teases them as "SOON" — a later epic); turf **booking/payment** (turf is a labelled selection, not a marketplace transaction); real-time multiplayer sync of the live match (single-scorer device in v1) |

## Relationship to other epics

- **`matchmaker` (MM)** — this epic is the design-and-social layer over MM's
  domain. RX2/RX4/RX6 render MM1–MM3's roster/draft/fixtures APIs; RX3/RX5/RX8
  add the voting, live-scoring, and points capabilities MM's design.md §10
  explicitly deferred. MM4's three desktop pages are **superseded** by the RX
  screens (kept until each RX equivalent lands). Coordinate the new schema/actions
  through MM's data model so the two epics don't fork `matchmaker.*`.
- **`saas-console-ux` (U)** — RX0 evolves U2's design system and U9's white-label
  tokens rather than replacing them: Rondo is a token theme + a set of new
  primitives, still shadcn/Radix/Tailwind underneath, so Cmd-K, skeletons, and
  empty states carry over. The responsive app shell extends U1's App Router +
  the existing `bottom-tabs`/`mobile-nav`.
- **`saas-multi-org-billing` (MO)** — "your squads" is multi-org membership; the
  team switcher reuses MO's org model. No billing gate is added to the football
  loop in this epic (matches MM's no-quota decision).
- **`saas-product-experience` (PX)** — PX5 (first-run onboarding) and RX1 (join a
  squad) share the same entry; align copy/flow so a new user lands in the Rondo
  loop, not a generic empty org.
- **`saas-performance` (PERF)** — the roster/draft/vote reads are bounded per-org
  scans; any latency finding routes to PERF, not here.

## Verification bar

A milestone is done when its screen is (1) **pixel-matched** to the prototype at
390×844 (documented diff, deviations justified), (2) **responsive** across the
360→1440 matrix with no horizontal scroll and touch targets ≥44px, (3) **live**
against the real api-edge route (no mock state), and (4) **reachable in all four
surfaces** where it adds an API (console + SDK + CLI parity for new routes).
"Looks right in Storybook" and "renders under `next dev`" are not completion
states — the bar is an authenticated Playwright walkthrough of the loop with
screenshots, matching MM4's bar.
