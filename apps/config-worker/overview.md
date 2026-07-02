# Config Worker

The config-worker exposes the Config read-only API surface for the Ogpic
platform. It runs as a Cloudflare Worker behind the public api-edge and is
reachable by other workers only through service bindings.

## Responsibilities
- Provide the read-only `config-api` surface.
- Enforce deny-by-default authorization by consulting the policy worker.
- Resolve membership context for config scoping.
- Provision the secrets-at-rest encryption key at deploy time (idempotent).

## Key dependencies
- `membership-worker` (`membership-api`) — org/membership context.
- `policy-worker` (`policy-api`) — authorization decisions.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
