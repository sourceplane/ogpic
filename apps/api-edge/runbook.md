# API Edge runbook

On-call operations for **api edge** — the single public HTTP entry point; every console, SDK, and CLI request passes through here.

## Service shape (what can break)

- The **public route** (the only worker with one) — a bad deploy here is a full outage.
- **Service bindings** to every bounded-context worker — a missing/renamed binding 500s just that context's routes.
- **KV** (idempotency) and auth/session verification on the hot path.

## First response

1. `wrangler tail api-edge --env <env>` — look for binding errors vs upstream 5xx.
2. Hit `GET /health` directly; if healthy but a feature fails, it's the owning worker — check its runbook.
3. One context failing = that worker or its binding; everything failing = edge deploy, auth, or the database. Correlate with the last run in Activities.

## Known failure modes

- **`unknown_action` / 404 on a valid route** — the target worker's deployed bundle predates a new policy action or route; redeploy the target worker (it converges on the next push).
- **Binding errors after a deploy** — the rendered `wrangler.jsonc` wiring is stale; re-run the deploy lane so BF6 wiring re-resolves.
- **429 storms** — rate-limit families are per-route-family; check whether one client is hot-looping the state or coordination family before raising limits.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
