# Implementation Status — matchmaker

> Trust code reality over this doc. Where this file and the running system
> disagree, the system is the source of truth and this file is the bug.

## Summary

| ID | Status | Notes |
|----|--------|-------|
| MM1 | Built in introducing PR — pending stage verify | Roster CRUD + summary + suggest-position: contract→worker→edge→SDK→CLI |
| MM2 | Built in introducing PR — pending stage verify | Deterministic balancing draft (`POST /draft`), N-team, unit-tested |
| MM3 | Built in introducing PR — pending stage verify | Fixtures CRUD + result + server-generated share payload |
| MM4 | Built in introducing PR — pending stage verify | Console surface (Roster / Draft Board / Fixtures) on the design system, over the live SDK |
| MM5 | Not started | Public unauthenticated share link |
| MM6 | Not started | `matchmaker.*` events → audit trail |
| MM7 | Not started | Bulk roster import/export |

## As-built (introducing PR)

New bounded context `matchmaker`, wired end to end:

- **Contracts** — `packages/contracts/src/matchmaker.ts` (exported from the
  package index and re-exported from `@saas/sdk`); five new org actions added to
  `ORGANIZATION_ACTIONS` in `packages/contracts/src/policy.ts`.
- **Policy** — `organization.roster.read/write`, `organization.draft.run`,
  `organization.fixture.read/write` registered in `@saas/policy-engine`
  (`ALL_KNOWN_ACTIONS` + owner/admin/builder = all five, viewer = the two
  reads). Effective-permission tests updated (owner 31→36; viewer +2).
- **DB** — migration `packages/db/src/migrations/200_matchmaker_core/up.sql`
  (schema `matchmaker`: `players`, `matches`) + manifest entry (checksum
  `86a9e5b2…`) + `@saas/db/matchmaker` repository (`Result`-typed, org-scoped,
  keyset-paginated) + package export.
- **Worker** — `apps/matchmaker-worker` (Cloudflare Worker): `index/router/http/
  ids/pagination/authz/mappers`, `membership-client` + `policy-client` service
  facades, the pure `engine/{ovr,positions,balance,share}`, and 14 handlers
  (players ×6, roster summary, suggest-position, draft, matches ×5, share).
  Bindings: `PLATFORM_DB`, `MEMBERSHIP_WORKER`, `POLICY_WORKER`. No billing
  binding, no events emission (MM6), no unauthenticated ingress.
- **Edge** — `apps/api-edge/src/matchmaker-facade.ts` registered in the `fetch`
  dispatch chain; `MATCHMAKER_WORKER` binding added to `env.ts`,
  `wrangler.template.jsonc` (stage+prod), and the `matchmaker` rate-limit family.
- **SDK** — `packages/sdk/src/matchmaker.ts` (`RosterClient` / `DraftClient` /
  `FixturesClient`) registered on `Ogpic` as `client.roster` / `client.draft` /
  `client.fixtures`; contract types re-exported.
- **CLI** — `packages/cli/src/commands/matchmaker.ts` (`matchmaker player …`,
  `roster summary`, `draft run`, `fixture …`) registered in `cli-runner.ts` with
  `--output json` parity and help text.
- **Console (MM4)** — three sibling routes under
  `apps/web-console-next/src/app/(app)/orgs/[orgSlug]/`: **Roster** (FUT-style
  player-card grid + squad-depth chips + scout/edit dialog with live OVR preview
  and attribute steppers + auto-suggest + release confirm), **Draft Board** (team
  count + auto-draft → two balanced pitches with rating-spread badge → schedule
  bar), **Fixtures** (history rows with score + status + record-result + cancel +
  a server-generated share sheet with copy/WhatsApp/email). Shared FUT card in
  `src/components/matchmaker/player-card.tsx`. Registered in the sidebar
  (`nav-items.ts` + icons), Cmd-K palette (`command-registry.ts`), and
  `query-keys.ts`. All three routes compile and route (200) under `next dev`.
- **Tests** — `tests/matchmaker-worker` (Jest, ts-jest ESM): 31 tests across the
  engine (OVR, positions, balance, share) and the draft handler (auth gate +
  validation + 412), all passing.

## Verification record

- `pnpm --filter @saas/{contracts,policy-engine,db,api-edge,sdk,cli,matchmaker-worker} typecheck` — clean.
- `pnpm --filter @saas/matchmaker-worker-tests test` — 31 passed.
- Regression suites re-run green: `policy-engine` (182, after updating the two
  effective-permission snapshots), `policy-worker` (20), `contracts` (112),
  `sdk` (126), `cli` (208).
- `wrangler deploy --dry-run` on `matchmaker-worker` — bundles (167 KiB).
- Pre-existing, unrelated: `api-edge` config-verification tests that read a
  rendered `apps/api-edge/wrangler.jsonc` fail on a fresh clone (the file is
  git-ignored / rendered at deploy time); confirmed failing identically without
  this change.

## Open follow-ups

- Stage verification of MM1–MM3 via authenticated CLI walkthrough, then prod
  smoke after promotion.
- MM4–MM7 per the implementation plan.
