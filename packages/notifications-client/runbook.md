# Notifications Client maintenance runbook

Maintaining **notifications-client** — the enqueue-side client workers use to send notifications.

## Change rules

- Enqueue must stay fire-and-forget: never let notification failures fail the caller's request path.

## Debugging consumers

1. Reproduce with the consumer's failing call in this package's test suite first.
2. Version skew: workers deploy independently — a "works locally" bug is usually one consumer on an older build; redeploy it.

## Releasing

Workspace-versioned: merging to `main` IS the release; every consumer picks the
change up on its next CI build. There is no separate publish step to forget.
