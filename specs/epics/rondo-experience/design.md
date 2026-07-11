# rondo-experience — Design

Status: Ready for implementation. Technical + visual design for the Rondo product
revamp. Tokens and per-screen measurements here are **normative** — the epic holds
a pixel-match bar (§7) against the prototype captured in `design-reference.md`.
This doc mirrors the section shape of `matchmaker/design.md`.

## 1. The shape of the problem

The console today is a desktop-first admin surface: a left sidebar, a topbar
scope switcher, and content pages built on shadcn/ui with an amber "golden hour"
theme (`globals.css` `--primary: 22 88% 45%`). The matchmaker product lives as
three of those pages (`roster`, `draft`, `fixtures`).

The Rondo prototype is a different animal: a **full-bleed mobile app** rendered
inside a 390×844 phone frame, dark carbon (`#050506`→`#0B0C0E`), one green accent
(`#56C98D`), black `Archivo` display type, `JetBrains Mono` micro-labels, and a
five-tab bottom nav that _is_ the product. It carries features the console has no
surface for at all — peer voting, availability, a live match clock, a community
feed and table.

The revamp reconciles these: keep the platform's engineering (App Router on
Workers, shadcn/Radix/Tailwind, token theming, one SDK client) and **replace the
visual system and the product shell** with Rondo's, screen for screen, while
letting the non-football surfaces inherit only the token refresh + the responsive
shell. Two design decisions make that tractable:

1. **Rondo is a theme + a primitive set, not a fork.** Every color is a token; the
   FUT card, stat tile, star row, availability pill, bottom sheet, and segmented
   control are new `packages/ui` primitives. White-label (U9) stays a tokens edit.
2. **Responsive = the same tree, two frames.** On a phone the app is full-bleed.
   On desktop the _same_ component tree renders inside a centered device frame for
   single-column screens, and widens to multi-column for list/detail screens (RX9).
   There is no second codebase and no separate "mobile app".

## 2. Design tokens (normative)

Extracted verbatim from the prototype. These land as CSS variables in the console
`globals.css` `.dark`/`:root` blocks and (where shared) `packages/ui` tokens.
Rondo ships as the **default theme**; the amber theme is retained as an alternate.

### Surfaces (dark, default)

| Token | Hex | Use |
|-------|-----|-----|
| `--r-bg` | `#050506` | app backdrop (radial `#121417→#050506`) |
| `--r-surface-0` | `#08090B` / `#0B0C0E` | screen background / phone frame body |
| `--r-surface-1` | `#111316` | cards, list rows |
| `--r-surface-2` | `#141619` | buttons (secondary), inputs, icon chips |
| `--r-surface-3` | `#1A1D21` / `#1C1F23` | sheet rows, small controls |
| `--r-line` | `rgba(255,255,255,.07–.11)` | hairline borders (card `.07`, control `.10`) |

### Text

| Token | Hex | Use |
|-------|-----|-----|
| `--r-text` | `#F4F3F0` | primary (near-white, warm) |
| `--r-text-2` | `#C9CBCE` / `#D8D9DA` | secondary |
| `--r-text-3` | `#8A8D93` / `#9A9DA3` | muted / captions |
| `--r-text-4` | `#63666C` | dim mono labels |
| `--r-text-5` | `#4E5157` / `#3A3E44` | disabled / placeholder glyphs |

### Accent & semantic

| Token | Hex | Use |
|-------|-----|-----|
| `--r-accent` | `#56C98D` | primary green; hover `#7CD9A6`; on-accent text `#07130D` |
| `--r-gold` | `#E0C074` / `#E7C979` | manager, streak, MOTM, warnings |
| `--r-blue` | `#6EA8FF` (text `#9AC3FF`) | Home team |
| `--r-red` | `#FF7A6B` (text `#FFA99E`) | Away team, "out", losses |
| Theme options | `#56C98D` · `#E7C979` · `#6EA8FF` · `#FF7A6B` | selectable accent (`$props.accent`) |

### Position colors (drives cards, pills, badges)

`GK #E0C074` · `DEF #6EA8FF` · `MID #56C98D` · `FWD #FF7A6B` · fallback `#9A9DA3`.

### Rarity tiers (by OVR — drives card gradient + numeral color)

| Tier | OVR | Accent | Card gradient |
|------|-----|--------|---------------|
| ELITE | ≥90 | `#E7C979` | `linear-gradient(158deg,#302C1F,#14120C 80%)` |
| GOLD | ≥84 | `#C6A15A` | `linear-gradient(158deg,#211F17,#121109 80%)` |
| SILVER | ≥78 | `#AEB4BD` | `linear-gradient(158deg,#1E2127,#111316 80%)` |
| BRONZE | <78 | `#B98457` | `linear-gradient(158deg,#231A13,#130E0A 80%)` |

### Type

- **Display / UI:** `Archivo` (weights 400–900; headings use **900**, letter-spacing
  −1.2px to −3px; body 600–800). Numerals (OVR, scores, record) are Archivo 900.
- **Mono / labels:** `JetBrains Mono` (400–700; uppercase micro-labels 9–13px,
  letter-spacing .5–1px, color `--r-text-4`). Both are already `@import`ed for the
  console's mono; add `Archivo` to the font stack.
- Scale seen in prototype: screen title 28px/900; section title 16px/800; card OVR
  32px/900; scoreboard 52px/900; body 13.5–15px; caption/mono 9–12px.

### Shape & elevation

- Radii: phone frame 52px; cards/sheets 14–22px; buttons 12–16px; pills 20px;
  icon chips 10–13px; avatar 50%.
- Shadows: cards `0 8px 22px -12px rgba(0,0,0,.7)`; sheets `0 -20px 50px
  rgba(0,0,0,.6)`; primary CTA none (flat accent fill).
- Borders are always hairline `rgba(255,255,255,α)`; acciaccent-tinted surfaces use
  `rgba(86,201,141,.22–.35)`.

### Motion (keyframes — port verbatim)

```
@keyframes rrise { from{transform:translateY(10px);opacity:0} to{...} }   /* screen enter, .4s ease */
@keyframes rpop  { from{transform:scale(.94);opacity:0} to{...} }         /* card/dialog */
@keyframes rsheet{ from{transform:translateY(100%)} to{translateY(0)} }   /* bottom sheet, .32s cubic-bezier(.2,.8,.2,1) */
```

All gated behind `@media (prefers-reduced-motion: reduce)` (already respected in
`globals.css`).

## 3. Component primitives (new in `packages/ui`)

Each is token-driven and documented with its prototype measurements. These are the
reusable atoms every screen composes:

| Primitive | Spec | Replaces / extends |
|-----------|------|--------------------|
| `PlayerCard` (FUT) | tier top-bar (2px), OVR 32px/900 in tier color, pos mono label in pos color, tier label 8px mono, hatched avatar 44px, optional 3×2 stat grid, name centered 12.5px/800 | extends existing `components/matchmaker/player-card.tsx` |
| `StatTile` | `#111316` card, value Archivo 22px/900 (semantic color), mono caption 10px | new |
| `MonoLabel` | `JetBrains Mono` 9–11px, uppercase, letter-spacing, `--r-text-4` | new |
| `BottomSheet` | full-width, `border-radius:28px 28px 0 0`, grabber (40×4), `rsheet` anim, scrim `rgba(4,5,6,.72)`+blur | extends `components/ui/sheet.tsx` |
| `SegmentedControl` | equal-flex buttons, active = accent fill / on-accent text; used for team-size (5·6·7·9·11) | new |
| `StarRating` | 1–5 tappable `★`, filled `#E7C979` / empty `#2A2E34`, 26px | new |
| `AvailabilityPill` | in `#56C98D` / maybe `#E0C074` / out `#FF7A6B` tinted pill, cycles on tap | new |
| `BalanceMeter` | Home avg ↔ Away avg with gradient bar + center marker + OVR-gap caption | new |
| `RecordStrip` | 4 stat tiles (played/won/drawn/lost) with semantic colors | new |
| `AppShell` | phone-frame-on-desktop / full-bleed-on-mobile wrapper + status-bar chrome (desktop only) + bottom nav | extends shell |

## 4. The responsive model (the load-bearing decision)

One React tree, breakpoint-driven presentation — a **real app at every width**, not
a phone mockup floating on a desktop page. (An early build framed the app in a
device bezel on desktop; that was wrong and has been replaced by the model below.)

- **`< 1024px` (phone/tablet):** full-bleed. The screen fills the viewport; a fixed
  **bottom tab bar** (`SQUAD·VOTE·PLAY·FEED·FIXTURES`) with `pb-safe` is the nav;
  sheets slide from the bottom edge. This is the pixel-match reference.
- **`≥ 1024px` (desktop):** a **persistent left sidebar** (brand, team switcher,
  vertical nav, account) + a **wide, fluid content area** (`.rondo-main`, its own
  scroll) with content centered at a generous `max-width` (~940px). No device
  frame, no faux status bar. Internal grids widen — the roster becomes an
  auto-fill FUT-card grid; Community splits into leaderboard **|** feed columns;
  the draft board keeps its two side-by-side team columns. Bottom sheets become
  centered dialogs.
- **Pre-auth screens (Login, Join):** full-bleed on mobile; a centered auth **card**
  on desktop (no sidebar).
- **Touch & input:** all tap targets ≥44px (prototype already ≥34–56px);
  hover states are additive, never required; `:focus-visible` rings on every
  control (a11y, RX9).

The shell (`rondo-app.tsx` + the `.rondo-shell/.rondo-sidebar/.rondo-main/
.rondo-bottomnav` classes in `rondo.css`) is the `AppShell`; it supersedes the
device-frame idea entirely. `bottom-tabs.tsx`/`mobile-nav.tsx` patterns and the
`pb-safe`/safe-area helpers informed it.

## 5. Screen catalogue (per-screen pixel + behaviour spec)

Full measurements, copy, and the reference state machine are in
`design-reference.md`. Summary of each screen and the milestone that owns it:

| Screen | Route (proposed) | Owns | Key behaviour |
|--------|------------------|------|---------------|
| **Login** | `/login` | RX1 | phone / Apple / Google / "explore a demo squad" → session; brand lockup, hairline field texture |
| **Join** | `/join` (or onboarding) | RX1 | 6-box invite code (OTP-style, per-char), squad-link paste, recent invites → accept invitation |
| **Squad** | `/orgs/:slug` (home) | RX2 | team switcher (multi-org), record strip, points/rank/streak, manager+captain, availability CTA, FUT grid |
| **Vote** | `/orgs/:slug/vote` | RX3 | voting-window banner + progress, teammate list → star sheet (6 skills ×1–5) → submit → OVR settles |
| **Play** | `/orgs/:slug/play` | RX4 | size segmented control, availability list (in/maybe/out cycle), draft → BalanceMeter + two team columns, tap-swap, re-draft, start/schedule |
| **Match** | `/orgs/:slug/play/live` | RX5 | LIVE minute badge, 52px scoreboard, home/away goal → scorer sheet, event timeline, MOTM chips, end→save |
| **Fixtures** | `/orgs/:slug/fixtures` | RX6 | schedule card (date/kick-off/turf radio-cards with price), confirm & notify, recent results |
| **Members** | `/orgs/:slug/members` | RX7 | invite code + copy, add-by-id, share link, pending requests (accept/decline), members & roles + remove |
| **Community** | `/orgs/:slug/community` | RX8 | local leaderboard (self highlighted), activity feed (result/news cards, points + MOTM + validated tags) |
| Overlays | — | resp. | team-switcher sheet (RX2), vote sheet (RX3), scorer sheet (RX5) |
| Bottom nav | — | RX0 | `SQUAD · VOTE · PLAY · FEED · FIXTURES`; active `#F4F3F0`, idle `#5A5D63`; PLAY highlights during live match |

## 6. Product model — what the UI needs the backend to add

RX2/RX6 render **existing** MM APIs. RX3/RX4/RX5/RX8 need **new additive backend
slices** (contract → worker → edge → SDK → CLI, per platform invariant), all in the
`matchmaker` bounded context, coordinated with `matchmaker/design.md`:

### RX3 — Voting → OVR (`matchmaker.player_votes`)
- New table `matchmaker.player_votes(id, org_id, rater_member_id, player_id, skill,
  stars 1–5, window_id, created_at)`, unique `(window_id, rater_member_id,
  player_id, skill)` so a re-vote updates in place. A **voting window** row
  (`matchmaker.vote_windows`) has `opens_at`/`closes_at`.
- On window close (or on read, lazily), each player's six attributes = the mean of
  submitted stars mapped to the 1–99 scale; the engine recomputes `rating` (OVR)
  the same way MM already does. **OVR provenance flips from admin-entered to
  community-settled** — the design's headline. Seed/admin ratings remain the
  fallback when a skill has no votes yet.
- Routes: `GET /vote/window` (current window + my progress), `GET
  /players/:id/my-votes`, `PUT /players/:id/votes` (submit my star row),
  `POST /vote/window` (open — organizer). RBAC: new `organization.vote.cast`
  (all members incl. viewer) + `organization.vote.manage` (builder+).

### RX4 — Availability (`matchmaker.availability`)
- `matchmaker.availability(org_id, member_id, match_window_id, state
  in('in','maybe','out'), updated_at)`. Draft reads `state='in'` members' linked
  players. Routes: `GET/PUT /availability` (self), `GET /availability/summary`
  (organizer counts). RBAC: `organization.availability.set` (all members).
- `POST /draft` already exists (MM2) — RX4 passes the available player ids to it.

### RX5 — Live match & result (extends `matchmaker.matches`)
- Add `events JSONB` (goal timeline `{team,player_id,min}`) + `motm_player_id` to
  `matchmaker.matches`; `PATCH /matches/:id` already records score/status (MM3).
  New `POST /matches/:id/events` (append a goal), `PATCH /matches/:id/motm`.
  Single-device scoring in v1 (no realtime sync — see risks). RBAC reuses
  `organization.fixture.write`.

### RX8 — Community points, leaderboard, feed (`matchmaker.points`, feed)
- A points ledger derived from results (win/draw/loss + MOTM), a squad-scoped
  `GET /community/leaderboard` (local table) and `GET /community/feed` (recent
  results + platform news). Points math is deterministic and server-owned. RBAC:
  `organization.community.read` (all members). Cross-squad "public friendlies"
  (the prototype's "SOON" card) is **out of scope** — see README.

Every new action is registered in `@saas/contracts/policy` +
`@saas/policy-engine`; every new route lands in SDK + CLI (parity invariant).

## 7. Pixel-match bar

"Pixel-matched" is defined operationally so it can be verified, not argued:

- Render each screen at **390×844** (dark) and overlay the prototype capture;
  spacing, type size/weight, and color must match within **±2px / exact hex**.
- Any intentional deviation (e.g. real avatar images vs the prototype's hatched
  placeholders, live data lengths, a11y focus rings) is **listed** in that
  milestone's `IMPLEMENTATION-STATUS.md` entry with a one-line justification.
- Tier/position/semantic colors come from tokens (§2) — no literal hex in
  components (U9 white-label invariant).

## 8. Constraint & non-goals (inherited)

- **Edge-only.** The console consumes only `api-edge`; every new screen's data
  rides a `/v1/...` facade route (matchmaker facade extended per §6). No internal
  Worker bindings from the browser (U constraint).
- **No football chrome on platform surfaces.** Billing, projects, config, audit,
  webhooks, admin, and account settings adopt the refreshed tokens + responsive
  shell only. They keep their information-dense layout; they do not become
  phone-framed football screens.
- **No new trust paths in the UI epic.** Public/unauthenticated squad pages and
  turf payment are out (README scope). Voting/availability/live/community are all
  **authenticated, org-scoped** reads/writes — no anonymous ingress.
- **Deterministic, server-owned domain logic.** Balancing (MM2), OVR-from-votes
  (RX3), and points (RX8) are computed server-side so "the app decided" stays an
  auditable claim; the client never forges an OVR, a balance, or a points total.
