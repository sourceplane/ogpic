# Webhook Verifier maintenance runbook

Maintaining **webhook-verifier** — HMAC signing/verification shared by webhook producers and consumers.

## Change rules

- Signature scheme changes require a dual-accept window (old + new) — consumers rotate on their own schedule.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
