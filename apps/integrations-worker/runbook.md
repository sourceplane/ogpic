# Integrations Worker runbook

On-call operations for **integrations worker** — provider connections (GitHub App first): installs, repo links, inbound webhook ingress → scm.* events.

## Service shape (what can break)

- **GitHub App credentials + HMAC-verified inbound webhooks** — third-party-coupled on both sides.
- Repo links (installation ↔ org/project) that the state plane's scm bridge consumes.

## First response

1. scm.* events not appearing: check GitHub's webhook delivery log (App settings) — was it delivered and rejected (HMAC/config), or never sent?
2. `wrangler tail integrations-worker` for verification failures.
3. Repo link problems: the `installation_id` keystone constraint means one install per org pair — check for a moved/reinstalled App before touching rows.

## Known failure modes

- **Webhook secret rotation** — GitHub retries failed deliveries; rotate secret, redeliver from GitHub's UI.
- **App uninstall/reinstall** — produces a NEW installation_id; links must be re-established, never remapped by hand.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
