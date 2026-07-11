# matchmaker — Design

Status: Ready for implementation. This is the technical design for the
`matchmaker` product bounded context. It mirrors the section shape of
`saas-integrations/design.md`.

## 1. The shape of the problem

The seed artifact (`football_match_manager.html`, "MatchMaker 26 — Ultimate
Draft Engine") is a single-file React app that does one thing very well: it
takes a pool of players with FUT-style ratings, **auto-drafts two balanced
teams**, lets you **schedule the fixture**, and **shares the lineup** on
WhatsApp / email / clipboard. Everything lives in browser memory; a JSON
export/import is the only persistence, and there is exactly one user.

That is a genuinely good product nucleus — the balancing draft is the moat —
trapped in a toy shell. The three things that make it a toy are the three
things this platform already solves for every other surface:

| Toy constraint (HTML) | Platform capability we already have |
|-----------------------|-------------------------------------|
| One anonymous user; state in `useState` | Users → Organizations → membership + RBAC (`identity`/`membership`/`policy`) |
| Roster lost on refresh; JSON file is the DB | Postgres via Hyperdrive, tenant-isolated repositories (`@saas/db`) |
| Balancing runs client-side, unversioned, unshareable | A deterministic server engine behind a typed contract (SDK + CLI + API parity) |
| "Share" = a copy-paste text blob | Server-owned fixtures with a durable share payload (and, later, a public link) |

So the repurpose is **not** a rewrite of the idea — it is lifting MatchMaker's
domain (players, draft, fixtures) onto the starter's tenancy, persistence, and
API rails so a *group* of people who play football together share one roster,
draft fair teams the same way every week, and keep a fixture history.

**Product framing.** The tenant (Organization) is a **community** — "Tuesday
Night Footy", a workplace 5-a-side, a Sunday league. Members collaborate on one
**shared roster**. Any organizer (a `builder`/`admin`) runs the **draft** to
split the available players into balanced sides, then **schedules** the fixture;
everyone else (`viewer`) sees the roster and the upcoming games. The balancing
engine is deterministic and server-owned, so "the app picked the teams, not
Dave" is a real, auditable claim.

This epic ships the **backend product** end to end (contract → worker → edge →
SDK → CLI) plus the roster/draft/fixtures console surface. It deliberately
leaves the public unauthenticated share link and live in-match scoring as
named follow-on milestones (§10).

## 2. Bounded context: `matchmaker`

One new Cloudflare Worker, `apps/matchmaker-worker`, owning one Postgres schema
(`matchmaker`). It mirrors the `projects-worker` anatomy exactly: `index.ts →
router.ts → handlers/* → @saas/db/matchmaker → Hyperdrive`, with `env.ts`,
`http.ts`, `ids.ts`, `pagination.ts`, and thin `membership-client` /
`policy-client` facades over service bindings.

It consumes only two downstream workers — `membership-worker` (authorization
context) and `policy-worker` (RBAC decision). It deliberately does **not** take
a `billing-worker` binding in v1 (no quota gate — see §9) and does **not** emit
to `events-worker` in v1 (audit trail is milestone MM6, §10). This keeps the
first slice's blast radius to: the new worker, its schema, the new edge facade,
and additive contract/SDK/CLI surface. No existing worker's behavior changes.

Novel to this context (not present in any existing worker) is the **draft
engine** — a pure, dependency-free, unit-tested module under
`apps/matchmaker-worker/src/engine/`. It is the one piece of real domain IP, so
it is isolated from I/O and exhaustively tested without a database.

## 3. Data model (`200_matchmaker_core`)

Schema `matchmaker`, two tables, both tenant-isolated by `org_id` (the platform
invariant: every row carries `org_id`, every query filters on it; no
cross-context foreign keys — `org_id` is an opaque UUID owned by `membership`).

### `matchmaker.players` — the shared roster

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | surfaced as `plr_<hex>` |
| `org_id` | `UUID NOT NULL` | tenant key |
| `name` | `TEXT NOT NULL` | display name; **not** unique (two "J. Smith" is legal, as in the HTML) |
| `position` | `TEXT NOT NULL` | `CHECK IN ('GK','DEF','MID','FWD','ALL')` |
| `rating` | `INT NOT NULL` | computed OVR (1–99), server-derived from `attributes` |
| `attributes` | `JSONB NOT NULL` | the six stat keys; outfield `{PAC,SHO,PAS,DRI,DEF,PHY}` or GK `{DIV,HAN,KIC,REF,SPD,POS}` |
| `status` | `TEXT NOT NULL DEFAULT 'active'` | `CHECK IN ('active','archived')` — soft-delete, mirrors projects |
| `created_at`/`updated_at` | `TIMESTAMPTZ` | |
| `archived_at` | `TIMESTAMPTZ` | null while active |

Index: `(org_id, created_at DESC, id DESC)` partial `WHERE status='active'` for
keyset pagination (same pattern as `projects.projects`).

`rating` and the attribute-set validity are **never trusted from the client** —
the worker recomputes `rating` from `attributes` via the engine on every write,
so a forged OVR is impossible. Storing it (rather than computing on read) keeps
list/draft queries sortable in SQL.

### `matchmaker.matches` — fixtures

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID` PK | surfaced as `mtc_<hex>` |
| `org_id` | `UUID NOT NULL` | tenant key |
| `scheduled_at` | `TIMESTAMPTZ NOT NULL` | kickoff |
| `status` | `TEXT NOT NULL DEFAULT 'scheduled'` | `CHECK IN ('scheduled','played','cancelled')` |
| `format` | `TEXT` | e.g. `5v5`, `11v11`; optional label |
| `team_a` / `team_b` | `JSONB NOT NULL` | **immutable lineup snapshots** at draft time (`{name,position,rating}` per player) |
| `rating_a` / `rating_b` | `NUMERIC NOT NULL` | avg squad rating captured at schedule time |
| `score_a` / `score_b` | `INT` | null until a result is recorded |
| `share_token` | `TEXT NOT NULL UNIQUE` | opaque token (`sht_<hex>`) for the future public link + stable share identity |
| `created_at`/`updated_at` | `TIMESTAMPTZ` | |

Design choice — **snapshot, not reference**: a fixture stores the lineup it was
drafted with, exactly as the HTML kept `teamA`/`teamB` on the match. Editing or
deleting a player later must not rewrite history. This is why teams are `JSONB`
snapshots and not join rows to `players`.

Index: `(org_id, scheduled_at DESC, id DESC)` for the fixtures list;
unique on `share_token`.

The migration adds one entry to `packages/db/src/manifest.ts` (id
`200_matchmaker_core`, context `matchmaker`) with its sha256 checksum; the
runner refuses an unlisted or drifted file.

## 4. Draft and the tenancy keystone

The draft is a **stateless compute** endpoint — `POST
/v1/organizations/:orgId/draft` — that reads players and returns balanced teams
without writing anything. The keystone is that it is still fully tenant-gated:
membership context → policy decision (`organization.draft.run`) → only then read
`org_id`-scoped players.

The algorithm is lifted verbatim in behavior from the HTML's `generateTeams`,
generalized from "two teams" to `teamCount ≥ 2`:

1. Bucket the selected players by position (`GK, DEF, MID, FWD, ALL`).
2. Sort each bucket descending by OVR.
3. Distribute each bucket in order: send the next player to the **smallest**
   team; break size ties by sending to the team with the **lowest total OVR**.
   (Positional groups are placed GK→DEF→MID→FWD→ALL so keepers and spines are
   spread before utility players.)

This yields size-balanced sides with minimized rating skew, deterministically
(no `Math.random`) — the same roster always drafts the same teams, which is
what makes "the engine decided" defensible. The response reports each team's
`squadRating` (avg) and the `ratingSpread` (max−min across teams) so the UI can
show how fair the split is.

Request body: `{ playerIds?: string[]; teamCount?: number; teamNames?: string[] }`
— `playerIds` defaults to all active players; `teamCount` defaults to 2;
`teamNames` defaults to `["Home Team","Away Team", …]`. The client then passes a
chosen draft straight into `POST /matches` to schedule it.

**Auth is enforced on every route** via the standard three-step gate
(`fetchAuthorizationContext` → `authorizeViaPolicy` → read), with the platform's
**deny-as-404** convention. New policy actions (§9) are registered in
`@saas/contracts/policy` and `@saas/policy-engine`; an unregistered action
denies with `unknown_action`, so registration is mandatory, not optional.

## 5. Edge ingress and the public surface

All authenticated routes are fronted by one new facade,
`apps/api-edge/src/matchmaker-facade.ts` (`isMatchmakerRoute` +
`handleMatchmakerRoute`), registered in the `fetch` dispatch chain and bound to
`MATCHMAKER_WORKER`. It follows `project-facade.ts` to the letter: method
guards, `replayOrExecute(request, requestId, env, "matchmaker", …)` idempotency
wrapper, `resolveActor`, forward with `x-actor-*` headers to
`https://matchmaker.internal`, `Server-Timing` passthrough.

Route table (all under `/v1/organizations/:orgId`):

```
POST   /players                 scout a player
GET    /players                 list roster (?position=, cursor)
GET    /players/:playerId       read
PATCH  /players/:playerId       update name/position/attributes (recompute OVR)
DELETE /players/:playerId       archive
POST   /players/suggest-position  pure: best-fit position from attributes
GET    /roster/summary          squad depth + avg rating by position
POST   /draft                   balance players into teams (stateless)
POST   /matches                 schedule a fixture from a draft
GET    /matches                 list fixtures (cursor)
GET    /matches/:matchId        read
PATCH  /matches/:matchId        reschedule / record score / set status
DELETE /matches/:matchId        cancel
GET    /matches/:matchId/share  server-generated share payload (text + fields)
```

v1 adds **no unauthenticated ingress**. The public share *link*
(`GET /v1/shared/matches/:shareToken`, no auth) is deliberately deferred to MM5
(§10) because it is the only genuinely new trust path — the same posture the
integrations epic took with its edge ingress. The `share_token` column is
minted now so the link is a pure additive read later, never a migration.

## 6. Server-owned sharing

`GET /matches/:matchId/share` replaces the HTML's client-side
`generateShareText`. The worker (via `engine/share.ts`) returns both a
ready-to-send `text` blob (the emoji fixture summary, byte-for-byte the HTML's
format) **and** a structured `fields` object, plus prebuilt `whatsappUrl` /
`mailtoUrl`. Generating share content server-side means every channel (console,
CLI `matchmaker fixture share`, a future bot) renders identical text, and the
future public link renders from the same code path.

## 7. Acting on it — SDK, CLI, console

Full API/SDK/CLI/UI parity is a platform invariant, so every route lands in all
four surfaces:

- **SDK** (`packages/sdk/src/matchmaker.ts`): three org-scoped clients —
  `client.roster` (players + summary + suggest-position), `client.draft`
  (`run`), `client.fixtures` (matches + share) — registered on `Ogpic` and with
  contract types re-exported from the SDK index.
- **CLI** (`packages/cli/src/commands/matchmaker.ts`): `matchmaker player
  {list,scout,show,edit,release}`, `matchmaker roster summary`, `matchmaker
  draft run`, `matchmaker fixture {list,schedule,show,share,cancel,result}` —
  registered in `cli-runner.ts` with `--output json` parity.
- **Console** (`apps/web-console-next`, milestone MM4): three pages under
  `orgs/[orgSlug]/matchmaker/` — Roster (FUT-card grid + scout/edit),
  Draft Board (run draft → review balanced pitches → schedule), Fixtures
  (history + share). Rebuilds the HTML's three tabs on the design system, over
  the live API.

## 8. Console UX (design direction)

The seed's visual identity is strong and worth keeping: dark, "console game
dashboard" aesthetic, lime accent, FUT-style gradient player cards whose rarity
tier is driven by OVR (≥90 gold, ≥80 yellow, `ALL` cyan). The console rebuilds
this **on the platform design system** (`src/components/ui/*`, dark-by-default,
token-driven) rather than raw Tailwind, so it inherits Cmd-K, skeletons,
designed empty states, and theming. The three tabs become three routed pages;
the "Draft Board" empty state and the auto-draft CTA carry over directly. This
is milestone MM4 and is spec-only in this epic (the backend ships first, verified
by CLI, so the surface is never ahead of a real API).

## 9. Governance — RBAC, validation, quotas

**RBAC.** Five org-level actions are added to the policy matrix:

| Action | owner | admin | builder | viewer | billing_admin |
|--------|:--:|:--:|:--:|:--:|:--:|
| `organization.roster.read` | ✓ | ✓ | ✓ | ✓ | — |
| `organization.roster.write` | ✓ | ✓ | ✓ | — | — |
| `organization.draft.run` | ✓ | ✓ | ✓ | — | — |
| `organization.fixture.read` | ✓ | ✓ | ✓ | ✓ | — |
| `organization.fixture.write` | ✓ | ✓ | ✓ | — | — |

Rationale: a `viewer` is a *player* (sees roster + fixtures); a `builder` is an
*organizer/captain* (drafts and schedules); `admin`/`owner` are community
admins. These map cleanly onto the existing role ladder with no new role kind.
Added to `ORGANIZATION_ACTIONS` (`@saas/contracts/policy`) and to
`ALL_KNOWN_ACTIONS` + the owner/admin/builder/viewer permission lists in
`@saas/policy-engine`.

**Validation.** Hand-rolled per handler (repo convention — no zod on the API
layer). `name` 1–80 chars; `position ∈ {GK,DEF,MID,FWD,ALL}`; each attribute an
integer 1–99; the attribute **key set must match the position class** (GK keys
for `GK`, outfield keys otherwise) — a mismatch is `422`. `rating` in any request
body is ignored and recomputed. Draft `teamCount` 2–8; `scheduled_at` a valid
ISO instant; `score_a/score_b` non-negative integers when recording a result.

**Quotas.** No billing entitlement gate in v1 (unlike `projects`). Roster size
is naturally small for the social use case; a `limit.roster` gate is a trivial
additive follow-on if a paid tier ever needs it, and its absence removes the
`billing-worker` binding from the first slice. Called out explicitly so the
omission is a decision, not a miss.

## 10. What deliberately does NOT exist (v1)

- **No public share link.** `GET /v1/shared/matches/:token` (unauthenticated) is
  milestone **MM5**; the `share_token` is minted now so it is a pure additive
  read later. v1 adds zero unauthenticated ingress.
- **No live in-match scoring / timeline.** The HTML has no live match clock; we
  do not invent one. Fixtures carry a final `score_a/score_b` and a `played`
  status only. A live event timeline (goals, cards, subs) is a future epic, not
  this one.
- **No events/audit emission.** Roster and fixture mutations do not yet append to
  `events-worker`; wiring them into the audit log is milestone **MM6**. (The
  handlers are written so the in-transaction event append drops in the same way
  `projects-worker` does it.)
- **No standings / league table / cross-fixture stats.** Aggregates (top scorers,
  form, table) are a reporting epic once fixtures accrue results.
- **No player photos / crests / media.** Cards are typographic, as in the seed.
- **No import of the HTML's JSON backup as an API.** Bulk import/export is a
  convenience milestone (**MM7**); v1's per-player writes already cover onboarding
  a roster, and the CLI makes scripted seeding trivial.
