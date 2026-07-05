# Policy Worker runbook

On-call operations for **policy worker** — deny-by-default RBAC evaluation; every context re-checks policy here before acting.

## Service shape (what can break)

- **The policy evaluation path** — an outage fails closed: requests are DENIED, not exposed.
- Role assignments read from Postgres; the policy-engine library does the pure evaluation.

## First response

1. Symptom is usually 403s everywhere ("permission denied" on known-good accounts).
2. `wrangler tail policy-worker` — look for schema errors after a migration touching `role_assignments`.
3. A brand-new action string (e.g. a new `*.read`) 403s until this worker's bundle knows it — check whether the caller shipped ahead of the policy deploy.

## Known failure modes

- **New policy action unknown** — deploy ordering: ship policy-worker before (or with) the feature that names the new action.
- **Deny-by-default surprises on new surfaces** — the fix is a role grant or policy rule, never a bypass in the caller.
- Fail-closed is by design: do not "temporarily allow" during an incident.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
