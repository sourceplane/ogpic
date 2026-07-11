# Epic: matchmaker

**Repurpose the platform into a multi-tenant football draft & fixtures product.**
The seed artifact (`football_match_manager.html` — "MatchMaker 26") is a strong
single-user, in-browser idea: scout players with FUT-style ratings, auto-draft
two balanced teams, schedule the fixture, share the lineup. This epic lifts that
domain — **roster, draft, fixtures** — onto the starter's tenancy, persistence,
and API rails so a *community* of people who play football together share one
roster, draft fair teams the same way every week, and keep a fixture history —
reachable from console, SDK, and CLI with full parity.

## Status

| Field | Value |
|-------|-------|
| Status | **In progress** (MM1–MM3 backend built in the introducing PR; MM4–MM7 open) |
| Cluster | **MM** (MM1–MM7) — the first *product* bounded context on the starter |
| Owner(s) | `apps/matchmaker-worker`, `apps/api-edge`, `packages/{contracts,policy-engine,db,sdk,cli}`, `apps/web-console-next` (MM4) |
| Target branch | `main` |
| Builds on | B1 identity/membership, policy engine, `@saas/db` + Hyperdrive, B4 SDK/CLI, U console foundation |
| Decisions locked | One new bounded context (`matchmaker`); org = community/tenant; roster is org-scoped and shared; draft is a deterministic server engine; fixtures store immutable lineup snapshots; RBAC via new `organization.roster/draft/fixture.*` actions; **no** billing gate and **no** unauthenticated ingress in v1 |

## Thesis

The seed app is a good product nucleus trapped in a toy shell: state in
`useState`, roster lost on refresh, balancing unversioned and unshareable, one
anonymous user. Every one of those constraints is something the starter already
solves for every other surface — users/orgs/RBAC, tenant-isolated Postgres, a
typed contract surface across SDK/CLI/console. So the repurpose is a **lift, not
a rewrite**: keep the balancing draft (the moat) and the FUT-card identity, and
put them behind the platform's tenancy and API rails.

Concretely, the introducing PR ships the product **backend end to end** — a new
`matchmaker` Worker (roster CRUD, a deterministic balancing draft, fixtures with
result recording and a server-generated share payload), its Postgres schema, the
edge facade, and full SDK + CLI surface — with the pure engine exhaustively
unit-tested. The console surface and the "nice-to-have" upgrades (public share
link, audit trail, bulk import) are named follow-on milestones so the backend is
never ahead of a verified API.

This is also the starter's **first true product bounded context** (everything
prior is platform plumbing), so it doubles as the reference for "how a product
area plugs into the ogpic baseline."

## Read order

1. `README.md` (this file) — charter.
2. `design.md` — the domain lift, data model, draft engine, RBAC, and the
   explicit non-goals.
3. `implementation-plan.md` — MM1–MM7 with acceptance criteria.
4. `IMPLEMENTATION-STATUS.md` — as-built record for the introducing PR.

## Milestones at a glance

| ID | Milestone | Status |
|----|-----------|--------|
| MM1 | Roster: players CRUD + squad-depth summary + position auto-suggest (contract→worker→edge→SDK→CLI) | Built — pending stage verify |
| MM2 | Draft engine: deterministic balancing compute (`POST /draft`), N-team, unit-tested | Built — pending stage verify |
| MM3 | Fixtures: schedule from a draft, list/get, reschedule/result, cancel, server-generated share payload | Built — pending stage verify |
| MM4 | Console surface: Roster / Draft Board / Fixtures pages on the design system, over the live API | Ready |
| MM5 | Public share link: unauthenticated `GET /v1/shared/matches/:token` read | Ready |
| MM6 | Audit trail: emit `matchmaker.*` events to `events-worker` on roster/fixture mutations | Ready |
| MM7 | Portability: bulk roster import/export API (migrate the HTML's JSON backup) | Planned |

## Scope boundary

| In scope | Out of scope |
|----------|--------------|
| One product bounded context (`matchmaker`); org-scoped shared roster; deterministic server-side balancing draft; fixtures with immutable lineup snapshots + result recording + share payload; additive RBAC actions; full API/SDK/CLI parity; console surface (MM4) | Live in-match scoring / event timeline (goals, cards, subs); standings / league tables / cross-fixture stats; player media (photos, crests); billing/quota gate; unauthenticated ingress beyond the deferred MM5 read link; changing identity/tenancy ownership |

## Relationship to other epics

- **`saas-baseline` (B)** — consumes B1 identity/membership + the policy engine
  + B4 SDK/CLI rails; adds the first product actions to the RBAC matrix.
- **`saas-console-ux` (U)** — MM4 builds its three pages on U's console
  foundation (design system, Cmd-K, empty/skeleton states); no change to U's
  charter.
- **`saas-resources-runtime` (P2)** — orthogonal. Matchmaker is a hand-rolled
  bounded context, not a manifested resource; if P2's resource model lands, a
  future epic could re-project roster/fixtures as managed resources.
- **`saas-performance` (PERF)** — adds no hot-path work; the draft read is a
  bounded per-org scan. Any latency finding routes to PERF.

## Verification bar

The pure engine (OVR, position rules, balancing, share text) is unit-tested
without a database. Backend milestones are verified on stage via authenticated
CLI walkthrough (`ogpic matchmaker …`) and smoke-checked on prod after
promotion. MM4 (console) is verified live with an authenticated Playwright
walkthrough and screenshots. "Implemented locally" is not a completion state.
