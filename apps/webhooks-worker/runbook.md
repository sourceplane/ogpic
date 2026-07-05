# Webhooks Worker runbook

On-call operations for **webhooks worker** — outgoing webhook endpoints, deliveries, and the inbound delivery inbox.

## Service shape (what can break)

- **Outbound deliveries** to customer endpoints (untrusted, slow, flaky by nature).
- HMAC signing (secret ciphertexts); the delivery retry lane.

## First response

1. Deliveries failing for ONE endpoint = the customer's endpoint; the delivery log proves our half (status, latency, response snippet).
2. Failing for ALL endpoints = our lane: tail the worker and check the retry cron.

## Known failure modes

- **Slow customer endpoints** — deliveries time out and retry with backoff; do not raise timeouts globally for one endpoint.
- **Secret rotation** — rotating an endpoint secret invalidates in-flight signatures; customers must accept both during their rotation window.
- **Replay requests** — replay from the delivery log via the API, never by hand-crafting payloads.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
