# Web Console runbook

On-call operations for **web console** — the customer-facing Next.js console on Workers — every product surface renders here.

## Service shape (what can break)

- Static assets + SSR on Workers; talks ONLY to the public API through the SDK (no privileged path).
- Session cookie handling at the edge.

## First response

1. Console down but API healthy (SDK/CLI work) → this worker's deploy or assets; roll back the console alone.
2. One page failing = usually its API surface — check the owning worker; the console is a thin client by design.
3. Blank/stale data with 200s → check the API response shape for a contract drift before blaming the UI cache.

## Known failure modes

- **Asset/deploy skew** — HTML referencing missing hashed assets right after a deploy heals on retry; persistent skew means a partial upload — redeploy.
- **Auth loops** — cookie domain/secure flags per environment; verify env config before code.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
