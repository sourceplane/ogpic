# rondo-experience — Test Plan

Status: Normative verification bar. Mirrors MM4's bar: "renders under `next dev`"
is **not** a completion state. Each milestone is verified on four axes — **pixel**,
**responsive**, **functional (live)**, and **parity** — before it is marked done.

## 1. Pixel-match verification

- Render each screen at **390×844** in dark mode and overlay the prototype capture
  (`design-reference.md`). Spacing, type (size/weight/tracking), and color must
  match within **±2px / exact token hex** (`design.md` §7).
- Produce a per-screen deviation list in `IMPLEMENTATION-STATUS.md`; every delta
  (avatar images, live data lengths, focus rings, a11y contrast bumps) carries a
  one-line justification.
- Assert **no literal hex** in components (grep gate) — all color via tokens (U9).

## 2. Responsive matrix

Screenshot + interaction check at **360 / 390 / 768 / 1024 / 1440** px:

| Width | Expectation |
|-------|-------------|
| 360–767 | full-bleed app; fixed bottom nav with `pb-safe`; sheets slide from bottom; no horizontal scroll |
| 768–1023 | single-column screens render inside the centered 390 device frame on the radial backdrop; faux status bar visible |
| 1024–1440 | list/detail screens use the wide multi-column layout; bottom nav → left rail; sheets → centered `rpop` dialogs (RX9) |

- Touch targets ≥ **44px**; hover is additive only; `prefers-reduced-motion`
  collapses `rrise`/`rpop`/`rsheet`.

## 3. Functional (live, per milestone)

All checks run against the **real api-edge route** (no mock state), authenticated.

- **RX0** — every primitive renders to spec in isolation; `AppShell` framing flips
  at 768px; bottom nav routes; console build + typecheck green; no product-screen
  regression.
- **RX1** — real sign-in completes from Login; a squad invite is accepted from Join
  via code and via link.
- **RX2** — home renders the real roster as FUT cards; switcher lists the user's
  real orgs and switches URL scope; manager/player CTA reflects real RBAC.
- **RX3** — submit per-skill stars → persists (unique per rater/player/skill/window,
  re-vote updates in place); window settle recomputes OVR from votes (card OVR
  changes; CLI confirms); non-member denied (deny-as-404).
- **RX4** — availability persists per member; draft of `in` players returns two
  balanced sides with correct BalanceMeter + OVR gap; swap + re-draft correct;
  non-manager read-only.
- **RX5** — goals + MOTM append to a real fixture; timeline/scoreboard reflect
  persisted events; "End & save" writes final score/status; result visible in RX6/RX8.
- **RX6** — schedule from the turf flow creates a real match; recent results colored
  by win/draw/loss.
- **RX7** — manager copies code/link, resolves a pending request, removes a member —
  each a real mutation reflected on refresh; non-manager read-only.
- **RX8** — points compute deterministically from real results; local leaderboard
  ranks the squad correctly; feed shows real fixtures; RX2 points/rank now read the
  ledger.
- **RX9** — 360→1440 clean; accent-token swap re-themes fully; axe + keyboard pass
  on every screen; Cmd-K reaches every surface.

## 4. Parity (any milestone adding a route)

For RX3/RX4/RX5/RX8, the new routes must exist and behave identically across
**console + SDK + CLI** (platform invariant). Add:

- Unit tests for the pure domain additions (OVR-from-votes settling; points math)
  under `tests/matchmaker-worker` — deterministic, no DB.
- Handler tests for auth gate (deny-as-404 for unregistered/denied actions),
  validation (star range 1–5, availability enum, score non-negative), and the new
  RBAC actions' effective-permission snapshots in `policy-engine`.
- SDK + CLI walkthrough (`ogpic matchmaker …`) covering each new verb with
  `--output json` parity.

## 5. Regression gate (every milestone)

- `pnpm --filter @saas/{contracts,policy-engine,db,api-edge,sdk,cli,matchmaker-worker} typecheck` clean.
- Existing matchmaker + policy suites re-run green (update effective-permission
  snapshots when RBAC actions are added — expect owner/admin/builder +N, viewer +
  the read actions).
- `wrangler deploy --dry-run` bundles for any touched worker.
- The console builds and every existing platform surface (billing/projects/config/
  audit/webhooks/admin/account) still renders — the token refresh must not break
  them (R6).

## 6. Closing verification (RX10)

One authenticated Playwright walkthrough of the whole loop, screenshots attached,
run on stage then smoked on prod after promotion: **join → rate teammates → set
availability → draft balanced sides → play & score live → schedule the next fixture
→ see the result on the feed and the leaderboard.** Pixel deltas documented; MM4's
superseded pages removed/redirected.
