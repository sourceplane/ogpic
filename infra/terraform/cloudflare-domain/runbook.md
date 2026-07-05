# Cloudflare Domain runbook

Operating **cloudflare domain** — DNS + custom-domain wiring for the product surfaces.

## Blast radius

- DNS/route changes propagate globally and cache; mistakes are slow to heal.

## First response

1. Verify records against the plan output; check propagation with dig before assuming breakage.

## Known failure modes

- **Route collisions** — two workers claiming one route: the deploy that lost is fine, fix the route map, redeploy.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../../../docs/runbook.md).
