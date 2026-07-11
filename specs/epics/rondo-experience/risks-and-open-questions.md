# rondo-experience — Risks & Open Questions

Status: Living register. Decisions locked at charter time are in `README.md`;
this file tracks the risks and the questions that need a human/product call before
the affected milestone starts. Follows the park-and-continue posture used across
the epics: human-independent work proceeds; human-gated items are parked, not
blocked-silent.

## Risks

### R1 — Pixel-match vs. real data & a11y (Design)
The prototype uses fixed-width names, hatched avatar placeholders, and no focus
rings. Real data (long names, avatars, empty rosters) and a11y (visible focus,
contrast) will force deviations. **Mitigation:** the pixel bar (`design.md` §7) is
"±2px / exact hex" with an explicit deviation list per milestone; a11y additions
(RX9) are pre-declared allowed deltas. Ellipsis + min-width rules from the
prototype markup are carried over.

### R2 — Two epics editing `matchmaker.*` (Coordination)
RX3/RX4/RX5/RX8 add tables/columns/actions to the `matchmaker` bounded context
that `matchmaker/design.md` §10 explicitly deferred. If MM and RX both evolve the
schema, migrations can collide. **Mitigation:** all RX backend slices land as new
migration files in `packages/db/src/migrations/` under the `matchmaker` context,
additive-only, coordinated in the MM data model doc; no rewrite of MM1–MM3 tables
(voting/availability/events are new tables or additive columns). Renumber against
the live manifest at implementation time.

### R3 — OVR provenance change breaks the "engine decided" claim (Product)
Today OVR is admin-entered and the balance is deterministic from it. RX3 makes OVR
the *settled mean of peer votes*. If settling is non-deterministic or gameable, the
auditable "the app picked the teams" claim weakens. **Mitigation:** settling is a
pure server function (mean of stars → 1–99, unvoted skills fall back to seed);
one vote per rater/player/skill/window (unique constraint); windows are explicit
and closeable so a draft always references a settled snapshot, never a live tally.

### R4 — Live match single-device assumption (Product / UX)
The prototype scores on one device with no realtime sync. Two people scoring the
same match concurrently would diverge. **Mitigation (v1):** single-scorer device;
`POST /matches/:id/events` is append-only with server-assigned ordering; last
writer's final score wins on "End & save". Realtime multi-device sync is out of
scope (README) and a candidate future epic.

### R5 — Scope creep from the prototype's "SOON" teaser (Product)
The Community feed teases "public friendlies… winners take a cut of rival team
points" — cross-squad, public, and points-transacting. That is a whole new
trust/economy surface. **Mitigation:** it renders as a **static SOON card** only;
cross-squad play, public squad pages, and points transfer are explicitly out of
scope and left to a future epic.

### R6 — Re-chroming platform surfaces (Design / regression)
Applying football chrome to billing/projects/config/audit would regress the SaaS
baseline's buyer credibility and information density. **Mitigation:** the scope
boundary is firm — platform surfaces take the **token refresh + responsive shell
only**; only the ten football screens get the full Rondo treatment.

### R7 — Turf mistaken for a marketplace (Product)
The Fixtures turf picker shows prices/distances, implying booking + payment.
**Mitigation:** turf is a **labelled selection** stored on the match; no booking,
availability lookup, or payment. A turf marketplace is a separate epic if ever.

### R8 — Font addition & bundle weight (Perf)
Adding `Archivo` (multiple weights, several unicode ranges — see the prototype's
`@font-face` set) increases font payload. **Mitigation:** subset to latin +
latin-ext, `font-display:swap`, self-host via the existing font pipeline; measure
against PERF budgets and route any regression to PERF.

## Open questions (need a product/human call)

| # | Question | Blocks | Default if unanswered |
|---|----------|--------|-----------------------|
| Q1 | Should Rondo be the console's **default** theme for all tenants, or a per-tenant/white-label opt-in? | RX0 default-theme decision | Ship Rondo as default dark theme; amber retained as an alternate token set (reversible via token swap). |
| Q2 | Are **players** the same entity as **members**, or a member-linked roster (a member "claims" a player card)? Voting/availability are per-*member*; the roster is per-*player*. | RX3/RX4 data model | Keep MM's `players` as the roster; add an optional `member_id` link so votes/availability attach to a member while unclaimed players still exist (matches the prototype, where roster ⊇ voters). |
| Q3 | Voting window cadence — weekly auto-windows, or manually opened by an organizer? | RX3 | Organizer-opened windows (explicit `POST /vote/window`); auto-cadence is a later enhancement. |
| Q4 | Rondo-points formula (win/draw/loss/MOTM weights; the "+24 PTS" in the feed)? | RX8 | Deterministic default (e.g. win 3·base + MOTM bonus) documented in RX8; tune later — the ledger is derived, so a re-tune is a recompute, not a migration. |
| Q5 | Do platform/admin surfaces need a **light** Rondo variant, or dark-only for the football screens with the existing light mode elsewhere? | RX9 theming | Football screens dark-first (prototype is dark-only); keep the working light mode for platform surfaces. |
| Q6 | "Manager/Captain" — are these new roles or a presentation of existing RBAC roles (owner/admin/builder→manager, member→player)? | RX2/RX7 | Presentation of existing roles (MM's mapping: builder+ = organizer/manager, viewer = player); no new role kind. |

Answer Q2/Q6 before RX3 (they shape the vote/availability keys and role gating);
Q1/Q5 before RX0/RX9; Q3/Q4 are tunable and don't block the schema.
