# Policy Engine maintenance runbook

Maintaining **policy-engine** — the pure deny-by-default evaluation library the policy worker embeds.

## Change rules

- Pure and deterministic: every change needs a table-driven test; the worker just feeds it facts.
- Never add I/O here — data assembly belongs to the callers.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
