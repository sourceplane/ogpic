# Webhooks Worker

The webhooks-worker owns webhook endpoint, subscription, and delivery-attempt
management for the Ogpic platform. It runs as a Cloudflare Worker behind the
public api-edge and is reachable by other workers only through service bindings.

## Responsibilities
- Provide the `webhooks-api` for endpoints, subscriptions, and delivery attempts.
- Enforce deny-by-default authorization by consulting the policy worker.
- Resolve membership context for webhook scoping.

## Key dependencies
- `membership-worker` (`membership-api`) — org/membership context.
- `policy-worker` (`policy-api`) — authorization decisions.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
