# Supabase runbook

Operating **supabase** — the Postgres project (database, auth config) under the whole platform.

## Blast radius

- The database. Everything downstream fails together when it does.

## First response

1. Check Supabase status + connection counts first on any all-context outage.
2. Coordinate schema-touching changes with the db-migrate lane, never both at once.

## Known failure modes

- **Connection exhaustion** — raise pool limits via Hyperdrive config, not by adding direct connections.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../../../docs/runbook.md).
