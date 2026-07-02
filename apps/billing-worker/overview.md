# Billing Worker

The billing-worker owns the Billing bounded context for the Ogpic platform. It is
a private, service-binding-only Cloudflare Worker with no public surface, and
integrates with the Polar billing provider.

## Responsibilities
- Provide the private `billing-api` (service-binding only, no public route).
- Integrate with Polar as the billing provider.
- Enforce deny-by-default authorization by consulting the policy worker.

## Key dependencies
- `policy-worker` (`policy-api`) — authorization decisions.
- Polar — billing provider (via the private Polar adapter).

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
