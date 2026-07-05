# Testing maintenance runbook

Maintaining **testing** — shared test harness utilities (fixtures, fake executors, helpers).

## Change rules

- Changes ripple into every suite — run the full test fan-out before merging.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
