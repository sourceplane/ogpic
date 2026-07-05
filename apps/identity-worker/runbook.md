# Identity Worker runbook

On-call operations for **identity worker** — users, sessions, API keys, OAuth/magic-link sign-in — the authentication root of every request.

## Service shape (what can break)

- **Session/API-key verification** — failures here read as platform-wide 401s.
- **Postgres via Hyperdrive** (identity schema) for users, sessions, keys.
- **Outbound email** (magic links) via the notifications worker.

## First response

1. Platform-wide 401s? Almost certainly here. `wrangler tail identity-worker --env <env>`.
2. Check the last identity-touching deploy in Activities and diff it.
3. Magic links not arriving = notifications-worker or its provider, not identity — verify by checking session creation for password/OAuth flows.

## Known failure modes

- **Session validation latency spikes** — Hyperdrive pool saturation; check other workers for the same signature.
- **OAuth callback failures after config changes** — redirect URIs are environment config (config-worker), not code; verify per-env settings.
- **Never** hand-edit sessions/keys in the database; use the admin worker's support tooling so audit events emit.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
