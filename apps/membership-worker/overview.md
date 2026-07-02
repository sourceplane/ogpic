# Membership Worker

The membership-worker owns organizations and membership for the Ogpic platform.
It runs as a bounded-context Cloudflare Worker behind the public api-edge and is
reachable by other workers only through service bindings.

## Responsibilities
- Provide the `membership-api` for organization and membership management.
- Enforce deny-by-default authorization by consulting the policy worker.
- Surface billing context for member-scoped operations.

## Key dependencies
- `policy-worker` (`policy-api`) — authorization decisions.
- `billing-worker` (`billing-api`) — billing context.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
