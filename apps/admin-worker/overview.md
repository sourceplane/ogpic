# Admin Worker

The admin-worker is an internal Cloudflare Worker providing audited
support/administration diagnostics for the Ogpic platform. It is reachable
through service bindings and is not part of the public marketplace surface.

## Responsibilities
- Provide the internal `admin-api` for support and administration diagnostics.
- Keep administrative actions audited.

## Key dependencies
- `cloudflare-hyperdrive` — pooled Postgres access.

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
