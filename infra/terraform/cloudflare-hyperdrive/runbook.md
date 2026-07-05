# Cloudflare Hyperdrive runbook

Operating **cloudflare hyperdrive** — the pooled Postgres access path every worker uses.

## Blast radius

- A Hyperdrive misconfig looks like a total database outage across all contexts at once.

## First response

1. All workers timing out on queries simultaneously = here (or Supabase itself), not any single context.
2. Check Supabase health, then the Hyperdrive config binding (BF6 wiring) in the last deploy.

## Known failure modes

- **Credential rotation** — rotate in Secrets Manager, re-run the deploy lane so wiring re-resolves; never inline credentials.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../../../docs/runbook.md).
