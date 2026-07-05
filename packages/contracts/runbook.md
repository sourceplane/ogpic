# Contracts maintenance runbook

Maintaining **contracts** — the shared API/tenancy/event types + validators every worker, the SDK, and the console compile against.

## Change rules

- A breaking type change here breaks CONSUMERS at typecheck — which is the point. Ship additive changes; deprecate before removing.
- Wire-shape changes must stay backward-compatible: old CLI/SDK versions are in the wild.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
