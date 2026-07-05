# Operations runbook

Operating ogpic day to day: environments, deploys, rollbacks, and the checks
worth running before paging anyone. Architecture background:
[`architecture.md`](./architecture.md).

## Environments

| Env | Approval | Origin |
|-----|----------|--------|
| `dev` | none | workers.dev (dev lane) |
| `stage` | required | https://ogpic-web-console-next-stage.rahulvarghesepullely.workers.dev |
| `prod` | required; promotion depends on `stage` | https://ogpic-web-console-next-prod.rahulvarghesepullely.workers.dev |

Custom domains (`ogpic.app`) are pending; the workers.dev origins above are
canonical until then (keep them in sync with [`overview.md`](./overview.md)).

## Deploys — always through orun

The repo is the desired state; CI executes it. **Never** `wrangler deploy` or
`terraform apply` by hand — a hand deploy is drift the next plan will fight.

- **Ship:** merge to `main`. The push trigger plans and runs the affected
  components through dev → stage → prod (approval-gated).
- **Inspect first:** `orun plan` locally (or in the PR lane) shows the exact
  DAG a merge would execute — deterministic, diffable.
- **Roll back:** revert the commit and let the pipeline converge. State is
  git-shaped; the revert *is* the rollback. There is no snowflake to restore.
- **Re-run a lane:** re-trigger the failed workflow; plans are content-addressed,
  so an unchanged component is a no-op, not a redeploy.

## Health checks (in order)

1. **Is it the edge or a context?** The console and SDK go through `api-edge`
   only. A single failing feature usually means its owning worker; everything
   failing means the edge, auth, or the database.
2. **Worker logs:** `wrangler tail <worker> --env <env>` (read-only; tailing is
   not a deploy) on the suspect context.
3. **Database:** Supabase status + Hyperdrive connectivity — the workers reach
   Postgres only through Hyperdrive; a Hyperdrive outage looks like every
   context timing out at once.
4. **Third parties:** billing = Polar; email = the notifications provider;
   GitHub App = integrations-worker. Each degrades its own surface only —
   anything cross-cutting is not them.
5. **Catalog/state sync:** if the Orun Cloud workspace looks stale (old
   overview, missing entities), check the last clean `main` build — the
   catalog auto-pushes only from a clean default branch. A dirty or failing
   build means the platform is honestly showing the last good state, not a bug.

## Common failure modes

| Symptom | Likely cause | First move |
|---|---|---|
| 401s everywhere | identity-worker or session/key validation | tail identity-worker; check recent auth-touching deploys |
| One org sees another's 404s | never acceptable — tenancy invariant | treat as an incident; audit the offending route's org scoping |
| Writes fail, reads fine | Postgres/Hyperdrive write path or a bad migration | check the latest `packages/db` migration in the failing env |
| Billing webhooks missing | Polar delivery or webhook-verifier | webhooks-worker inbox + provider dashboard |
| Deploy “succeeded” but behavior unchanged | component not in the affected set, or env approval pending | read the plan output — what did it actually execute? |

## Secrets & config

Secrets are managed through the platform's secret manager and deploy-lane sync
— never `wrangler secret put` by hand (same drift rule as deploys). Flags and
settings live in config-worker and are changeable per environment without a
deploy.

## Escalation

Owner: `platform` (see `intent.yaml` `repo.owner`). Repo, README, and forking
guide links are on the workspace overview page — which is this doc set's front
page on Orun Cloud.
