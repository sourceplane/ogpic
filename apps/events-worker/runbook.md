# Events Worker runbook

On-call operations for **events worker** — the canonical domain event log, audit surface, and the shared-cursor event lanes (ES1).

## Service shape (what can break)

- `event_log` writes from every context (append-only, the platform's source of truth for "what happened").
- Lane cursors + dead-letter/replay for downstream consumers (notifications, webhooks).

## First response

1. Downstream consumers (notifications/webhooks) starving → check lane cursor lag here before their workers.
2. `wrangler tail events-worker`; look for append failures (DB) vs consumer lane errors.

## Known failure modes

- **Lane lag** — one slow consumer lane does not block others; find the lagging lane's poison event and dead-letter it.
- **Replay** — replay moves the cursor, it never mutates the log; the event log is append-only, full stop.
- **Event storms** — the storm breaker throttles fan-out, not ingestion; ingestion loss is a sev-1.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
