# Cloudflare KV runbook

Operating **cloudflare kv** — the KV namespaces (idempotency, caches) workers bind to.

## Blast radius

- Deleting/renaming a namespace orphans bindings in every dependent worker.

## First response

1. Binding failures after an infra apply → re-run the dependent workers' deploy lanes to re-render wiring.

## Known failure modes

- **Namespace ID drift** — IDs are wiring-resolved at deploy (BF6); committed IDs anywhere are the bug.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../../../docs/runbook.md).
