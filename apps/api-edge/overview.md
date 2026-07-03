# API Edge

The api-edge is the single public HTTP entrypoint for the Ogpic platform. It runs
as a Cloudflare Worker and fronts every bounded-context worker, routing inbound
requests to the right service over Cloudflare service bindings so that the
internal workers stay private.

## Responsibilities
- Expose the public `edge-api` surface for the Ogpic marketplace.
- Route and proxy requests to the bounded-context workers via service bindings.
- Provide the `/health` endpoint used by downstream deploy smoke checks.
- Use Cloudflare KV for request idempotency.

## Key dependencies
- `cloudflare-hyperdrive` — pooled Postgres access.
- `cloudflare-kv` — idempotency KV store.
- Bounded-context workers: identity, membership, projects, events, config,
  metering, billing, webhooks, integrations, notifications (via service bindings).

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
