# Cloudflare Domain

`cloudflare-domain` manages the ogpic Cloudflare zone (adopting the existing
`ogpic.app` zone) and attaches custom domains to the environment-specific Worker
services that serve the console (`web-console-next`).

## Responsibilities
- Adopt and manage the Cloudflare zone for `ogpic.app`.
- Attach per-environment custom domains to the `web-console-next` Worker
  service.

## Key dependencies
- `web-console-next` — the Worker service the custom domains are attached to.

## Delivery
Provisioned by Terraform through orun; plan on PRs, apply on merge to `main`,
for both stage and prod.
