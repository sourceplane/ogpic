# DB maintenance runbook

Maintaining **db** — the migration harness + per-context repositories (raw SQL over Hyperdrive).

## Change rules

- New migrations: numbered, additive, idempotent; register in the manifest and regenerate `migrations.lock`.
- Repository changes ship with the worker that consumes them — never lead with a schema the code doesn't use.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
