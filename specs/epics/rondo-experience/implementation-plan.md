# rondo-experience — Implementation Plan

Status: Normative milestone plan. Each milestone is the largest coherent
reviewable unit with one primary outcome, ends in a **"Done when"** gate, and
follows the platform invariants (edge-only console; contract→worker→edge→SDK→CLI
parity for any new route; deny-by-default RBAC; deterministic server-owned domain
logic). Sequencing is the Orchestrator's call; the ordering below reflects hard
dependencies.

Legend: **Design** = pixel/shell work on `web-console-next` + `packages/ui`;
**Product** = a new additive backend slice + its surface.

---

## RX0 — Design system + responsive app shell  ·  Design  ·  **Ready**

Stand up the Rondo visual system and the shell every screen renders inside,
without yet moving any product screen onto it.

- Add Rondo tokens to `apps/web-console-next/src/styles/globals.css` (and shared
  `packages/ui` tokens): surfaces, text, accent, gold/blue/red, position palette,
  tier palette, radii, motion keyframes (`rrise`/`rpop`/`rsheet`). Add `Archivo`
  to the font stack (mono already present). Rondo becomes the default theme;
  amber retained as an alternate token set.
- Build the primitives in `packages/ui` (`design.md` §3): `PlayerCard` (extend
  the existing matchmaker card), `StatTile`, `MonoLabel`, `BottomSheet` (extend
  `sheet.tsx`), `SegmentedControl`, `StarRating`, `AvailabilityPill`,
  `BalanceMeter`, `RecordStrip`, `AppShell`.
- `AppShell`: phone-frame-on-desktop / full-bleed-on-mobile wrapper (`design.md`
  §4) with the `SQUAD · VOTE · PLAY · FEED · FIXTURES` bottom nav (extend
  `bottom-tabs.tsx`), faux status bar on desktop only, safe-area padding.

**Done when:** every primitive renders in isolation matching the prototype spec
(§3/§E) at exact tokens; `AppShell` shows the framed view ≥768px and full-bleed
<768px with a working bottom nav; no product screen regressed; typecheck +
existing console build green.

---

## RX1 — Auth & onboarding  ·  Design  ·  Planned  ·  _needs RX0_

Move the entry flow onto the new shell.

- **Login** (`/login`): rebuild per D1 — brand lockup, phone/Apple/Google CTAs,
  "explore a demo squad", wired to the existing session/auth-callback flow (no new
  auth mechanism; the buttons drive the current login).
- **Join** (`/join` or onboarding route): D2 — 6-box invite-code entry
  (per-char, active-box glow), squad-link paste, recent-invites list — over the
  existing invitations accept flow.

**Done when:** an unauthenticated visitor lands on the pixel-matched Login, can
sign in through the real flow, and can accept a squad invite via code/link on
Join; both responsive; Playwright walkthrough + screenshots attached.

---

## RX2 — Squad home  ·  Design + Product  ·  Planned  ·  _needs RX0; renders MM1_

The home screen and multi-squad switching over live data.

- **Squad** (`/orgs/:slug` home): D3 — team-switcher header, record strip,
  Rondo-points/rank/streak (points/rank read from RX8's ledger when it lands;
  until then render from a documented placeholder source, flagged), manager+captain,
  availability CTA (role-gated), FUT roster grid over `GET /players`.
- **Team switcher sheet** (D12): lists the user's orgs (multi-org membership),
  switches active squad, "Join a squad" / "Create team".

**Done when:** the home screen renders the real roster as FUT cards, the switcher
lists the user's real orgs and switches scope (URL-driven, U3), role gating
(manager vs player CTA) reflects the caller's real RBAC role; responsive; live.

---

## RX3 — Rate teammates (voting → OVR)  ·  Product  ·  Planned  ·  _needs RX0/RX2_

The headline new capability: community-settled OVR.

- Backend slice (`design.md` §6 · coordinate with `matchmaker/design.md`):
  `matchmaker.vote_windows` + `matchmaker.player_votes` migration + repo; engine
  step that recomputes each player's attributes/OVR from settled stars (falling
  back to seed ratings for unvoted skills); routes `GET /vote/window`,
  `GET /players/:id/my-votes`, `PUT /players/:id/votes`, `POST /vote/window`
  (organizer); new RBAC `organization.vote.cast` (all members) +
  `organization.vote.manage` (builder+); SDK + CLI parity.
- **Vote** screen (D4) + **vote sheet** (D5): window banner + progress, teammate
  list, 6-skill star sheet, submit → optimistic "Rated ✓".

**Done when:** a member submits per-skill stars via the sheet, the vote persists,
and after the window settles the target's OVR recomputes from votes (verified by
CLI + a card OVR change); RBAC denies a non-member; parity across SDK/CLI/console.

---

## RX4 — Availability + Play (draft)  ·  Product  ·  Planned  ·  _needs RX0/RX2; uses MM2 draft_

- Availability slice: `matchmaker.availability` migration + repo; routes
  `GET/PUT /availability` (self), `GET /availability/summary` (organizer counts);
  RBAC `organization.availability.set` (all members); SDK + CLI parity.
- **Play** screen (D6): team-size `SegmentedControl`, availability list with the
  cycling `AvailabilityPill`, "Draft N available" → live `POST /draft` (MM2) over
  the `in` players → `BalanceMeter` + two team columns; tap-to-swap (client-side
  over the returned draft); re-draft; "Start match" (→ RX5) / "Schedule for later"
  (→ RX6). Non-manager sees the read-only availability view.

**Done when:** availability persists per member; the manager drafts real available
players into two balanced sides with a correct BalanceMeter/OVR-gap; swap and
re-draft work; role gating enforced; responsive; live.

---

## RX5 — Live match  ·  Product  ·  Planned  ·  _needs RX4_

- Extend `matchmaker.matches` with `events JSONB` + `motm_player_id`; routes
  `POST /matches/:id/events` (append goal `{team,player_id,min}`),
  `PATCH /matches/:id/motm`, and reuse `PATCH /matches/:id` for final score/status
  (MM3). Reuse `organization.fixture.write`. Single-device scoring in v1 (no
  realtime sync — see risks). SDK + CLI parity.
- **Match** screen (D7) + **scorer sheet** (D8): LIVE badge, 52px scoreboard,
  home/away goal → scorer picker → timeline, MOTM chips, "End & save result"
  persists the final score + timeline snapshot to the fixture.

**Done when:** goals + MOTM record to a real fixture from the UI, the timeline and
scoreboard reflect persisted events, ending the match writes final score/status;
the result surfaces in Fixtures (RX6) and the feed (RX8); live.

---

## RX6 — Fixtures  ·  Design + Product  ·  Planned  ·  _needs RX0; renders MM3_

- **Fixtures** screen (D9): schedule card (date/kick-off/turf radio-cards with
  price + distance labels), "Confirm & notify squad" → `POST /matches` (MM3),
  recent-results list over `GET /matches`. Turf is a **labelled selection** stored
  on the match `format`/metadata — no booking/payment (scope boundary).

**Done when:** a fixture is scheduled from the pixel-matched flow and appears in
recent results with correct win/draw/loss coloring; responsive; live over MM3.

---

## RX7 — Manage squad (members)  ·  Design + Product  ·  Planned  ·  _needs RX0/RX2_

- **Members** screen (D10) over membership + invitations APIs: invite code +
  copy/share link, add-by-id, pending join requests (accept/decline), members &
  roles list (role + position, remove) — all RBAC-gated (manager-only mutations).
  Reuses existing invitation/membership endpoints; no new backend unless a
  member↔player link route is needed (documented if so).

**Done when:** a manager copies the invite code/link, resolves a pending request,
and removes a member — each a real membership mutation reflected on refresh;
non-managers see the read-only roster; responsive; live.

---

## RX8 — Community  ·  Product  ·  Planned  ·  _needs RX5 (results feed points)_

- Community slice: a deterministic server-owned Rondo-points ledger derived from
  fixture results (win/draw/loss + MOTM); routes `GET /community/leaderboard`
  (squad-scoped local table) + `GET /community/feed` (recent results + platform
  news items); RBAC `organization.community.read` (all members); SDK + CLI parity.
- **Community** screen (D11): leaderboard (self highlighted) + activity feed cards
  with points/MOTM/validated tags. The "public friendlies" news item renders as a
  static "SOON" card (cross-squad play is a future epic).

**Done when:** points compute deterministically from real results, the local
leaderboard ranks the user's squad correctly, and the feed shows real recent
fixtures; Squad-home points/rank (RX2) now read from this ledger; live.

---

## RX9 — Desktop adaptation, theming & a11y  ·  Design  ·  Planned  ·  _needs RX1–RX8_

- Multi-column desktop layouts (`design.md` §4) for list/detail screens (Fixtures,
  Members, Community, Roster): bottom nav → left rail ≥1024px; sheets → centered
  `rpop` dialogs; grids gain columns.
- White-label proof: swap the `accent` token set (the prototype's 4 options) and
  confirm no literal hex leaked into components (U9 invariant).
- a11y pass: `:focus-visible` rings on every control, keyboard traversal of sheets
  and the star/segmented/availability controls, `prefers-reduced-motion` honored,
  contrast checks on tinted text. Register every new screen + key action in the
  Cmd-K registry (`command-registry.ts`).

**Done when:** the 360→1440 matrix has no horizontal scroll and desktop uses the
wide layouts; an accent-token swap re-themes the whole app; axe/keyboard pass on
every screen; Cmd-K reaches every surface.

---

## RX10 — Verification & polish  ·  Planned  ·  _needs RX1–RX9_

- Pixel-diff each screen against the prototype at 390×844 (documented deltas).
- Responsive matrix screenshots (360/390/768/1024/1440).
- One authenticated Playwright walkthrough of the **whole loop**: join → rate →
  set availability → draft → play & score → schedule → see it on the feed/table.
- Prod smoke after promotion; retire MM4's superseded desktop pages.

**Done when:** the walkthrough passes green with screenshots, pixel deltas are
documented and justified, and MM4's old roster/draft/fixtures pages are removed or
redirected to the RX screens. The epic is then a candidate for ✅ in
`IMPLEMENTATION-STATUS.md`.

---

## Dependency graph (quick reference)

```
RX0 ─┬─ RX1
     ├─ RX2 ─┬─ RX3
     │       ├─ RX4 ── RX5 ── RX8
     │       └─ RX7
     └─ RX6
RX1..RX8 ── RX9 ── RX10
```

RX0 unblocks everything. RX2 unblocks the org-scoped product screens. RX8 (points)
feeds RX2's points/rank display, so RX2 ships those with a flagged placeholder
until RX8 lands. RX9/RX10 are the closing design + verification passes.
