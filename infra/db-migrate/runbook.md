# DB Migrate runbook

Operating **db migrate** — the migration lane that applies the ordered SQL migrations to Supabase Postgres.

## Blast radius

- Applies `packages/db` migrations (checksummed, ordered) per environment.
- A failed migration halts the lane — later app deploys may depend on the new schema.

## First response

1. Read the failing migration's error in the run log — most failures are privileges or a non-idempotent statement.
2. Never edit an applied migration: fix forward with a new numbered migration.
3. If an app deploy shipped ahead of its migration, re-run the lane; ordering is the contract.

## Known failure modes

- **Checksum mismatch** — someone edited an applied migration file; restore the original bytes and fix forward.
- **Long-running locks** — migrations run online; a table-rewrite belongs in a maintenance window with a plan.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../../docs/runbook.md).
