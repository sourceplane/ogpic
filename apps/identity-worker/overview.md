# Identity Worker

The identity-worker owns authentication and identity for the Ogpic platform. It
runs as a bounded-context Cloudflare Worker behind the public api-edge and is
reachable by other workers only through service bindings.

## Responsibilities
- Provide the `identity-api` for authentication and identity concerns.
- Enforce deny-by-default authorization by consulting the policy worker.
- Coordinate membership context and user-facing notifications.

## Key dependencies
- `cloudflare-hyperdrive` — pooled Postgres access.
- `policy-worker` (`policy-api`) — authorization decisions.
- `membership-worker` (`membership-api`) — org/membership context.
- `notifications-worker` (`notifications-api`) — user notifications.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
