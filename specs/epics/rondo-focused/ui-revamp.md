# Epic — Rondo UI revamp ("Pitchside v2")

> A complete, pixel-matched rebuild of the Rondo mobile UI against the approved
> design canvas (`Rondo_v2`, section 2 — the "Pitchside" direction). Shipped
> **phase by phase**, one incremental PR each → review → merge.

## The design

A light, ink-on-paper football app on **Space Grotesk + JetBrains Mono**. The
pitch is the interface; navigation is cut to a floating bottom bar; the product
is **role-aware** — a manager schedules/drafts/administers, a player only marks
availability, rates, and views games.

**Palette** — `#17694A` green (brand · HOME · CTAs) · `#101511` ink · `#C9A24B`
gold (manager) · `#B0512F` rust (AWAY · destructive) · `#F2F4F1` surface ·
`#E4EBE3` pitch · `#FFFFFF` card. Frames are 390×844.

The canvas defines **12 screens** in three groups:

- **2a Onboarding** — Login · Start (create/join) · Create team · Join with code · Invite squad
- **2b Manager app** — Home (pitch) · Schedule match · Draft · Manage squad
- **2c Player app** — Home · Rate · Games

## Phase plan (one PR each → review → merge)

| Phase | Scope | Status |
|------:|-------|--------|
| **1** | **Design-system foundation.** Space Grotesk font; `rondo-kit.css` light tokens + responsive phone shell (full-bleed mobile, centered 390-frame desktop); the `kit.tsx` primitives — StatusBar, MonoLabel, Chip, Button, FieldRow, Avatar, PitchCanvas + PlayerToken, RatingSegments, MapCard, BottomNav (manager/player), ScreenHeader; a `/rondo/kit` review gallery. Non-breaking: coexists with the legacy dark screens. | ✅ landed |
| **2** | **Onboarding (2a).** Login → Start (role picker) → Create team / Join with code → Invite squad, on the SDK (`organizations.create`, join-by-code). | — |
| **3** | **Manager app (2b).** Pitch-as-home + next-match strip + FAB nav; Schedule (day/time/turf + Maps pin, no booking); Draft (split pitch, auto-balance, swap); Manage squad (invite code, approvals, roles). | — |
| **4** | **Player app (2c) + role gating.** Player home (availability one-tap, 3-tab nav); Rate (segment scales, one player at a time, progress); Games (view-only). Managers get 2b, players get 2c. | — |
| **5** | **Wire + polish.** Live data on every screen; desktop/responsive pass; delete the legacy dark screens + Archivo; end-to-end verification (mobile + desktop). | — |

## Migration strategy

The legacy screens are a **dark** theme; the new system is **light**. A wholesale
token swap would break every screen mid-epic, so Phase 1 introduces the new
system **alongside** the old (scoped `.rk` vs `.rondo-root`). Each later phase
moves a screen group onto the kit; Phase 5 deletes the old system once nothing
references it.

## Definition of done

Each phase ships behind the platform bar (typecheck · lint · `next build` · CI
matrix) and is squash-merged. The epic is done when a manager can create a
squad, schedule a Maps-pinned match with auto-balanced editable sides, and a
player can join by code, mark availability, and rate teammates — every screen
pixel-matching the canvas, with the legacy dark UI removed.

## Progress (as-built)

- **Phases 1–4 merged** (#59 #60 #61 #62): the design-system foundation, and all
  **12 canvas screens** — onboarding (login · start · create · join · invite),
  the manager app (home · schedule · draft · manage squad) and the player app
  (home · rate · games) — each verified pixel-faithful with Playwright.
- **Phase 5 (this PR):** the token-free **demo** (`/rondo/demo`) now runs the
  Pitchside v2 app (manager/player toggle) instead of the legacy dark shell, so
  the new UI is the experience a signed-out visitor sees. Shared via
  `PitchsideDemo`; `/rondo/preview` aliases it.

### Remaining (Phase 6 — final)

Wire the new manager/player apps to **live** data on the authenticated
`/rondo/:orgSlug` route (roster → pitch, fixtures → games, votes → rate,
availability, join code/requests → squad) with real **role gating**
(owner → manager, member → player); then delete the legacy dark UI
(`rondo-app`, `screens`, `ui`, `logic`, `use-rondo`, `live`, `player-card`,
`rondo.css`) and the Archivo font, and run the end-to-end pass. Kept separate so
the authenticated app is never half-migrated.
