# Metering Worker

The metering-worker owns the Metering API surface for the Ogpic platform,
handling usage recording and quota checks. It runs as a Cloudflare Worker behind
the public api-edge and is reachable by other workers only through service
bindings.

## Responsibilities
- Provide the `metering-api` for usage recording and quota checks.
- Enforce deny-by-default authorization by consulting the policy worker.
- Resolve membership context for usage scoping.

## Key dependencies
- `membership-worker` (`membership-api`) — org/membership context.
- `policy-worker` (`policy-api`) — authorization decisions.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
