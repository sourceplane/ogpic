# Events Worker

The events-worker owns the Events and Audit bounded context for the Ogpic
platform. It runs as a Cloudflare Worker behind the public api-edge and is
reachable by other workers only through service bindings.

## Responsibilities
- Provide the `events-api` for event recording and audit trails.
- Enforce deny-by-default authorization by consulting the policy worker.
- Resolve membership context for event scoping.

## Key dependencies
- `membership-worker` (`membership-api`) — org/membership context.
- `policy-worker` (`policy-api`) — authorization decisions.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
