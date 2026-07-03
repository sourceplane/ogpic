# Cloudflare KV

`cloudflare-kv` provisions the Cloudflare KV namespaces that back the `api-edge`
idempotency replay store for the stage and prod environments. This KV namespace
lets the edge API deduplicate replayed requests.

## Responsibilities
- Provision Cloudflare KV namespaces for stage and prod.
- Back the `api-edge` idempotency replay store.

## Delivery
Provisioned by Terraform through orun; plan on PRs, apply on merge to `main`,
for both stage and prod.
