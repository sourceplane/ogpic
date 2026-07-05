# Metering Worker runbook

On-call operations for **metering worker** — usage metering and quota counters feeding billing and rate limits.

## Service shape (what can break)

- High-write counters in Postgres; consumers read quotas on hot paths.

## First response

1. Quota checks failing open/closed unexpectedly: tail this worker.
2. Usage graphs flat: check the emitting contexts first (metering only aggregates what arrives).

## Known failure modes

- **Counter hot spots** — a single tenant hammering one meter shows as write contention; rate-limit at the edge rather than dropping meter writes.
- **Backfill** — metering is append-derived; recompute aggregates from events rather than editing totals.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
