# Web Console (Next.js)

The web-console-next is the Ogpic web console: a Next.js 15 application delivered
on Cloudflare Workers plus Static Assets via `@opennextjs/cloudflare`. It is the
user-facing frontend and talks to the platform through the public api-edge.

## Responsibilities
- Serve the Ogpic web console UI (SSR + static assets).
- Consume the public `edge-api` for all platform data and actions.
- Deploy a per-environment Worker (`ogpic-web-console-next-{dev,stage,prod}`).

## Key dependencies
- `api-edge` (`edge-api`) — the public API entrypoint the console calls; it must
  be live before this component's stage/prod deploy smoke runs.

## Delivery
Deployed as a Cloudflare Worker with Static Assets via `orun run`; verify on PRs,
deploy on merge to `main`.
