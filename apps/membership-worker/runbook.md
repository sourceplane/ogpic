# Membership Worker runbook

On-call operations for **membership worker** — organizations, members, invitations, role assignments, and teams — the tenancy root.

## Service shape (what can break)

- **Org/member reads on every authorized request path** (authorization context assembly).
- Postgres membership schema; invitation email via notifications.
- The `parent_org_id` account layer and team tables (teams features).

## First response

1. "Wrong org" or missing-membership symptoms: check recent migrations on `membership.*` first.
2. `wrangler tail membership-worker` for the failing query.
3. Cross-tenant anomalies (one org seeing another's rows) are a **sev-1 tenancy incident**: capture the request id, do not ship anything else, audit the offending route's org scoping.

## Known failure modes

- **Invitations not arriving** — notifications-worker or provider; the invitation row existing here proves membership did its half.
- **Role changes not taking effect** — policy evaluation caches nothing by design; if a grant "doesn't work", the grant is at the wrong scope (org vs account) rather than stale.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
