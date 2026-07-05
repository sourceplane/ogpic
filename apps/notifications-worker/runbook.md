# Notifications Worker runbook

On-call operations for **notifications worker** — transactional email + Slack channel delivery, preferences, and the notification rules engine.

## Service shape (what can break)

- **Email provider** (outbound) and **Slack incoming webhooks** (per-org channel config).
- The ES2 rules engine (matching + throttling) and the async retry cron.
- Postgres notifications schema (preferences, suppressions, attempts).

## First response

1. "No email" reports: check the attempts table state via admin tooling before the provider dashboard — enqueued-but-failed vs never-enqueued tell different stories.
2. `wrangler tail notifications-worker` and check the retry cron's last sweep.
3. Slack deliveries failing for ONE org = that org's webhook URL (rotated/revoked); failing for all = provider or code.

## Known failure modes

- **Provider bounce/suppression** — respect suppressions; do not force-resend to suppressed addresses.
- **Throttle windows** — a "missing" notification may be correctly throttled by an ES2 rule; check rule matches before calling it a bug.
- **Retry storms** — the backoff ladder caps attempts; a poison notification parks rather than looping.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
