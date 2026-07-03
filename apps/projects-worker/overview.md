# Projects Worker

The projects-worker owns the Projects bounded context for the Ogpic platform. It
runs as a Cloudflare Worker behind the public api-edge and is reachable by other
workers only through service bindings.

## Responsibilities
- Provide the `projects-api` for project management.
- Enforce deny-by-default authorization by consulting the policy worker.
- Resolve membership context and billing state for project operations.

## Key dependencies
- `membership-worker` (`membership-api`) — org/membership context.
- `policy-worker` (`policy-api`) — authorization decisions.
- `billing-worker` (`billing-api`) — billing context.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
