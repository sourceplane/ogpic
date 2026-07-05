# Admin Worker runbook

On-call operations for **admin worker** — internal support tooling and cross-tenant admin reads — the operator's surface.

## Service shape (what can break)

- Privileged cross-tenant reads (gated by admin roles) and support mutations that emit audit events.

## First response

1. This worker failing affects operators, not customers — triage accordingly.
2. Verify admin role assignment before debugging "permission denied" here.

## Known failure modes

- **Every support mutation must go through this worker** (it emits the audit trail); direct DB edits are the anti-pattern this worker exists to prevent.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
