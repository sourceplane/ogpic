# Integrations Worker

The integrations-worker owns the Integrations bounded context for the Ogpic
platform: provider connections (GitHub App first), an inbound delivery inbox,
repo links, and the installation-token broker. It runs as a Cloudflare Worker
behind the public api-edge and is reachable by other workers only through service
bindings.

## Responsibilities
- Provide the `integrations-api` for provider connections and repo links.
- Operate as a GitHub-App-first integration surface with an inbound inbox.
- Broker installation tokens for connected providers.
- Enforce deny-by-default authorization by consulting the policy worker.

## Key dependencies
- `membership-worker` (`membership-api`) — org/membership context.
- `policy-worker` (`policy-api`) — authorization decisions.
- `billing-worker` (`billing-api`) — billing context.
- `projects-worker` (`projects-api`) — project/repo linkage.
- GitHub App — primary provider integration.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
