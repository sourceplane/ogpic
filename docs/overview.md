# Ogpic

**Photography-equipment rental marketplace, delivered as intent.**

Ogpic is a multi-tenant SaaS marketplace for renting photography gear. It is
built on a reusable Cloudflare + Supabase platform baseline (forked from the
Lumen / orun-cloud starter) and shipped as an [Orun](https://orun.sourceplane.ai)
component-native, desired-state repo: every Worker, Terraform stack, and database
migration declares itself as **component intent** next to its code, the repo as a
whole is **platform intent** (`intent.yaml`), and CI never runs a raw `pnpm`,
`wrangler`, or `terraform` command — it runs `orun plan` and `orun run`,
compiling the platform into a deterministic state and converging the deviation on
every commit.

This page is authored in the repo (`docs/overview.md`, referenced from the
`repo.docs.overview` block in `intent.yaml`) and pushed into the Orun service
catalog as a content-addressed blob on every clean plan — so it stays in lockstep
with the code it describes.

## What ships

The rental product sits on top of a platform foundation. Both are expressed as
Orun components and converge through the same pipeline.

### Runtime — bounded-context Cloudflare Workers behind one edge API

| Component | Responsibility |
|---|---|
| `api-edge` | Public HTTP entry point; the single edge API Worker that fronts every bounded-context worker |
| `identity-worker` | Users, sessions, API keys, OAuth |
| `membership-worker` | Organizations, members, invitations, role assignments |
| `projects-worker` | Projects and environments |
| `policy-worker` | Deny-by-default RBAC authorization decisions |
| `events-worker` | Domain events, audit log, observability |
| `config-worker` | Settings, feature flags, secret metadata |
| `metering-worker` | Usage ingestion, quota checks, rollups |
| `billing-worker` | Plans, subscriptions, invoices (Polar adapter; private, service-binding only) |
| `notifications-worker` | Email delivery and preferences (Cloudflare Email Service) |
| `webhooks-worker` | Outgoing webhook subscriptions, signing, delivery, replay |
| `integrations-worker` | Provider connections (GitHub App first), inbound delivery inbox, installation-token broker |
| `admin-worker` | Audited admin / support diagnostics workflows |
| `web-console-next` | Next.js 15 console on Cloudflare Workers + Static Assets (`@opennextjs/cloudflare`) |

### Shared libraries (`packages/`)

`contracts` (API/tenancy/event/error types + validators), `policy-engine` (RBAC
evaluation), `db` (migration harness + runner), `sdk` (runtime-agnostic control-plane
SDK), `cli` (the `ogpic` CLI), `notifications-client`, `webhook-verifier`,
`shared`, and `testing`.

### Data plane (`infra/`, Terraform)

`terraform/bootstrap` (S3 state + Secrets Manager access), `terraform/supabase`
(stage/prod Supabase projects), `terraform/cloudflare-hyperdrive` (pooled Postgres
fronting Supabase from Workers), `terraform/cloudflare-kv` (the `api-edge`
idempotency KV namespace), `terraform/cloudflare-domain` (zone adoption + console
custom domain), and `db-migrate` (migrations: plan on PR, apply on merge).

## How delivery works

```
intent.yaml + component.yaml (×N) + stack-tectonic compositions
                        │
                        ▼
              orun plan  ──►  plan.json  (the deterministic state for this commit)
                        │
                        ▼
              orun run   ──►  converge each component in dependency order
                        │
                        ▼
        catalog auto-push ──►  Orun service catalog (this overview + every entity)
```

- **Environments:** `dev` (verify-only — no provisioned Supabase project by
  design), `stage`, and `prod`. `prod` promotion gates on `stage`
  (`environments.prod.promotion.dependsOn: [stage]`).
- **Tenancy:** declared and enforced in `intent.yaml`
  (`execution.state.workspace` + `requireOrg`), so the workspace claim rides
  every remote op — including the credential-free CI OIDC exchange.
- **Catalog:** `execution.state.autopushCatalog: true` publishes the resolved
  catalog to Orun Cloud after every successful plan on `main`, keeping the
  service catalog — components, relations, docs, and this overview — fresh with
  no extra CI step.
- **Compositions:** golden paths live in the repo-local **Stack Tectonic** stack
  (`stack-tectonic/`), published to `ghcr.io/sourceplane/stack-tectonic`.

## Status

- Runtime is live per environment through Orun; the data plane is provisioned by
  Terraform with credentials in AWS Secrets Manager under
  `sourceplane/ogpic/<component>/<env>`.
- Database migrations run through `db-migrate` (plan on PRs, apply on merge to
  `main`).
- Billing is live end-to-end via the Polar adapter.
- **Credential-blocked tails:** production OAuth / magic-link auth and Stripe
  require human-supplied credentials; Cloudflare Email Service needs one-time
  account setup (Workers Paid plan + verified sending domain).

## Learn more

- [`README.md`](../README.md) — getting started, workspace layout, commands
- [`FORKING.md`](../FORKING.md) — rebranding and growing a fork a few components
  at a time
- [Orun](https://orun.sourceplane.ai) — the intent compiler this repo is built on
