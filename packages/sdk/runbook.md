# SDK maintenance runbook

Maintaining **sdk** — the typed client of the public API (Node, browsers, Workers).

## Change rules

- The SDK only speaks the public API; anything needing a privileged path is a design smell.
- New endpoints: add contracts first, then the SDK method, then consumers.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
