# Shared maintenance runbook

Maintaining **shared** — small cross-cutting utilities used by every worker.

## Change rules

- The dependency floor: this package depends on nothing internal; keep it that way.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
