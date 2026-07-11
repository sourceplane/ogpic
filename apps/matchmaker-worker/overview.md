# Matchmaker Worker

The `matchmaker` bounded context — the product surface repurposed from the
"MatchMaker 26" draft engine. Owns the `matchmaker` Postgres schema (players,
matches) and exposes three capabilities behind `api-edge`:

- **Roster** — a community's shared pool of players, each with a computed OVR
  and a six-attribute card (outfield or goalkeeper stat set).
- **Draft** — a deterministic, server-owned balancing engine that splits the
  roster into fair teams (`src/engine/balance.ts`).
- **Fixtures** — scheduled matches with immutable lineup snapshots, result
  recording, and a server-generated share payload.

## Shape

`index.ts → router.ts → handlers/* → @saas/db/matchmaker → Hyperdrive`, with the
standard `membership-client` / `policy-client` service-binding facades. Every
request is tenant-gated (membership context → policy decision → org-scoped read)
with the platform's deny-as-404 convention. The pure draft/OVR/share logic lives
under `src/engine/` and is unit-tested without a database.

Bindings: `PLATFORM_DB` (Hyperdrive), `MEMBERSHIP_WORKER`, `POLICY_WORKER`.

See `specs/epics/matchmaker/` for the epic, `specs/components` conventions, and
`runbook.md` for operations.
