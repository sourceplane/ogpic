# Matchmaker Worker — Runbook

## Health

`GET /health` returns `{ status, service: "matchmaker-worker", checks: { database,
membership, policy } }`. A `configured: false` check means the corresponding
binding is missing from the rendered `wrangler.jsonc`.

## Bindings

| Binding | Purpose | Missing behavior |
|---------|---------|------------------|
| `PLATFORM_DB` (Hyperdrive) | `matchmaker` schema reads/writes | data routes return `503` |
| `MEMBERSHIP_WORKER` | authorization context | all authed routes `503` |
| `POLICY_WORKER` | RBAC decision | all authed routes `503` |

The worker is reachable only via the `api-edge` service binding; it trusts the
`x-actor-*` headers the edge injects and never sees a raw bearer token.

## Migrations

Schema is created by `200_matchmaker_core` in `@saas/db` (players + matches).
Apply via the standard `infra/db-migrate` flow (`migrate:plan` on PR,
`migrate:apply` on merge). No worker-local migration step.

## Common issues

- **All authed routes 404** — expected for a subject with no membership in the
  target org, or a role lacking the matchmaker actions (`viewer` cannot write).
  Confirm the role grants `organization.roster.*` / `organization.fixture.*` /
  `organization.draft.run` in `@saas/policy-engine`.
- **Draft returns 412 `insufficient_players`** — the roster (or the supplied
  `playerIds`) has fewer active players than `teamCount`.
- **Share text renders in UTC** — `GET /matches/:id/share` formats kickoff in UTC
  deterministically; localization is a console concern.
