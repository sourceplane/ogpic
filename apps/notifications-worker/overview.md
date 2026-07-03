# Notifications Worker

The notifications-worker owns the Notifications bounded context for the Ogpic
platform. It is an internal-only Cloudflare Worker (no public smoke endpoint) and
sends mail through the Cloudflare Email Service via the `send_email` binding.

## Responsibilities
- Provide the `notifications-api` for the notifications bounded context.
- Send email through the Cloudflare Email Service (`send_email` binding).
- React to platform events from the events worker.

## Key dependencies
- `events-worker` (`events-api`) — source of platform events.
- `db-migrate` — schema migrations.
- Cloudflare Email Service — outbound email (`send_email` binding).

## Delivery
Deployed as a Cloudflare Worker via `orun run`; verify on PRs, deploy on merge to
`main`.
