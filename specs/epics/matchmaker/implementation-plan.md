# matchmaker — Implementation Plan (MM1–MM7)

Recommended order: MM1 → MM2 → MM3 land together as the backend slice (they
share the worker, schema, edge facade, and SDK/CLI surface introduced in the
first PR). MM4 (console) follows once the API is stage-verified. MM5–MM7 are
independent additive follow-ons in any order.

## MM1 — Roster (players) — Built (introducing PR)

The shared player pool: scout, list, read, edit, release, plus squad-depth
analytics and position auto-suggest.

- **Contracts.** `PublicPlayer`, `Create/Update/Get/List/ArchivePlayer*`,
  `RosterSummaryResponse`, `SuggestPosition*`, and the position/attribute-key
  constants in `@saas/contracts/matchmaker`.
- **DB.** `matchmaker.players` (migration `200_matchmaker_core`) + a
  `Result`-typed repository (`@saas/db/matchmaker`), tenant-scoped by `org_id`,
  keyset-paginated. OVR stored, never trusted from the client.
- **Worker + engine.** `create/list/get/update/archive-player`,
  `roster-summary`, `suggest-position` handlers; pure `engine/ovr.ts` +
  `engine/positions.ts` (attribute validation, key-set-per-position, OVR
  recompute on every write, best-fit suggestion).
- **Edge + SDK + CLI.** `matchmaker-facade` routes; `client.roster`
  (`list/get/scout/update/release/summary/suggestPosition`); `ogpic matchmaker
  player …` + `roster summary`.

Acceptance: a `builder`+ can scout/edit/release players and read the roster;
`viewer` can read but not write (deny-as-404); OVR is always the server-computed
mean of a position-valid attribute set; a GK key set on an outfield player is a
422. Verified by the engine unit tests + CLI walkthrough on stage.

## MM2 — Draft engine — Built (introducing PR)

The deterministic balancing draft, generalized from the seed's two-team split to
`teamCount` teams.

- **Engine.** `engine/balance.ts` — bucket by position, sort desc by OVR,
  assign each player to the smallest team (tie-break lowest total OVR). Pure,
  deterministic (no randomness), unit-tested for size balance, positional
  spread, tight rating spread, determinism, and team-count clamping.
- **Worker + edge + SDK + CLI.** `POST /draft` (stateless compute; reads
  org-scoped players, gated on `organization.draft.run`); `client.draft.run`;
  `ogpic matchmaker draft run [--team-count] [--players]`.

Acceptance: an even roster splits into equal squads; goalkeepers land on
separate teams; `ratingSpread` is minimal; the same roster always drafts the
same teams; a roster smaller than `teamCount` returns `412 insufficient_players`.

## MM3 — Fixtures (matches) — Built (introducing PR)

Persisted fixtures scheduled from a draft, with result recording and a
server-generated share payload.

- **Contracts + DB.** `PublicMatch` + `Create/Update/Get/List/Cancel*` +
  `MatchShareResponse`; `matchmaker.matches` with **immutable** `team_a`/`team_b`
  JSONB lineup snapshots, `status` (`scheduled|played|cancelled`),
  `score_a/score_b`, and a `share_token`.
- **Worker + engine.** `create/list/get/update/cancel-match`, `share-match`;
  pure `engine/share.ts` (the emoji fixture summary + WhatsApp/mailto links,
  server-side).
- **Edge + SDK + CLI.** facade routes; `client.fixtures`
  (`list/get/schedule/update/cancel/share`); `ogpic matchmaker fixture
  {list,schedule,show,share,result,cancel}`.

Acceptance: scheduling snapshots the chosen teams (editing a player later does
not rewrite history); a result sets score + `played`; `DELETE` soft-cancels;
`GET …/share` returns byte-identical text to the seed's format; all gated on
`organization.fixture.{read,write}`.

## MM4 — Console surface — Ready

Rebuild the seed's three tabs as three routed pages on the platform design
system, over the live API.

- **Console.** `orgs/[orgSlug]/matchmaker/{roster,draft,fixtures}` — FUT-card
  roster grid with scout/edit (OVR live-preview via the shared OVR helper),
  Draft Board (run draft → review balanced pitches → schedule), Fixtures history
  with the share sheet. Uses `useApiQuery` + `client.roster/draft/fixtures`,
  optimistic mutations, designed empty/skeleton states, Cmd-K entries.

Acceptance: an authenticated user completes scout → draft → schedule → share
entirely in the console; verified live (Playwright walkthrough + screenshots).

## MM5 — Public share link — Ready

Turn the `share_token` into an unauthenticated read link.

- **Edge + worker.** `GET /v1/shared/matches/:shareToken` (no session) →
  read-only fixture summary; a new public ingress path (design §5) — the only
  genuinely new trust path, so it ships separately with its own review.

Acceptance: a valid token returns the fixture's public summary with no auth; an
unknown/whitespace token is a 404; no other data is reachable via the token.

## MM6 — Audit trail — Ready

Emit domain events on roster/fixture mutations.

- **Worker.** Wrap the create/update/archive handlers' writes in the same
  in-transaction `events-worker` append `projects-worker` uses, emitting
  `matchmaker.player.*` / `matchmaker.match.*` with an audit projection; add a
  `MATCHMAKER_WORKER`-side events client. Surfaces in the existing audit UI.

Acceptance: every roster/fixture mutation produces an audit entry with the
actor, subject, and request id; reads are unaffected.

## MM7 — Portability (bulk import/export) — Planned

Migrate the seed app's JSON backup.

- **Contracts + worker + SDK + CLI.** `POST /players/import` (bulk upsert,
  validated + OVR-recomputed) and `GET /players/export`; `ogpic matchmaker
  roster {import,export}`. Lets an existing MatchMaker 26 user onboard a whole
  roster in one call.

Acceptance: exporting then importing round-trips a roster; a malformed backup is
rejected wholesale (no partial writes); import is idempotent per player id.
