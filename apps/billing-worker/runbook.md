# Billing Worker runbook

On-call operations for **billing worker** — plans, subscriptions, and invoices via the Polar provider; the revenue-critical context.

## Service shape (what can break)

- **Polar API** (outbound) and **Polar webhooks** (inbound, via webhooks ingress) — both third-party-coupled.
- Postgres billing schema; entitlement checks other contexts consult.

## First response

1. Billing UI failing but everything else fine → this worker or Polar. Check Polar's status page early.
2. `wrangler tail billing-worker` — distinguish outbound Polar 5xx from our own errors.
3. Webhook-driven state (subscription status) lagging → check the webhooks inbox for undelivered Polar events before touching billing rows.

## Known failure modes

- **Polar outage** — degrade: reads serve last-synced state; never guess entitlements. Backfill by replaying the webhook inbox once Polar recovers.
- **Plan/entitlement mismatch** — reconcile from Polar as the provider of record; the local rows are a projection.
- Never hand-edit billing rows: support flows go through the admin worker so audit + Polar stay consistent.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
