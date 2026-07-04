# Ogpic

**A photography-equipment rental marketplace** — the multi-tenant SaaS behind
renting and listing cameras, lenses, lighting, and studio gear.

Ogpic gives a gear-rental business everything it needs to run online: customers
and rental shops sign up, manage who has access, subscribe to a plan, and operate
the marketplace on a secure, billable, auditable foundation.

## What it does

- **Accounts & sign-in** — users, sessions, API keys, and OAuth / magic-link login.
- **Organizations & teams** — orgs, members, invitations, and role-based access so
  studios and rental shops can manage shared inventory.
- **Billing** — plans, subscriptions, and invoices (live via Polar), with
  usage-based metering and quotas.
- **Notifications & webhooks** — transactional email and outgoing webhooks for
  account and marketplace events.
- **Integrations** — provider connections and an inbound delivery inbox.
- **Admin & audit** — support tooling and a domain-event audit log across the
  platform.

## Live environments

Custom domains are still pending — these are the current workers.dev origins:

| Environment | Product |
|---|---|
| **Production** | https://ogpic-web-console-next-prod.rahulvarghesepullely.workers.dev |
| **Staging** | https://ogpic-web-console-next-stage.rahulvarghesepullely.workers.dev |

## Under the hood

Ogpic is built on a reusable Cloudflare Workers + Supabase SaaS platform and is
delivered as an [Orun](https://orun.sourceplane.ai) desired-state repo — every
worker, database migration, and this page converge through `orun plan` /
`orun run`. See [`README.md`](../README.md) for the architecture and
[`FORKING.md`](../FORKING.md) to fork it into your own marketplace.
