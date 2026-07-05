# Architecture

How ogpic is put together. The one-paragraph version: **a set of
bounded-context Cloudflare Workers behind a single API edge, backed by Supabase
Postgres, with a Next.js console — all declared as Orun intent and delivered by
`orun plan` / `orun run`, never by hand.**

> Front page: [`overview.md`](./overview.md) (what ogpic is, live environments).
> Operations: [`runbook.md`](./runbook.md).

## The shape

```
                        ┌────────────────────────────┐
  Browser / SDK / CLI → │  api-edge (public entry)   │ → service bindings →
                        └────────────────────────────┘
   identity · membership · projects · policy · events · config · metering
   billing · notifications · webhooks · integrations · admin   (one Worker each)
                              │
                    Supabase Postgres (via Hyperdrive)  ·  R2  ·  KV
                              │
                web-console-next (Next.js on Workers, Static Assets)
```

- **One public entry.** `apps/api-edge` is the only Worker exposed to the
  internet. It authenticates, resolves tenancy in the path, and proxies to the
  owning context over Cloudflare service bindings (the facade pattern). No
  bounded context calls another's database — ever.
- **Bounded contexts.** Each `apps/*-worker` owns one domain (identity,
  membership/orgs/teams, projects, policy, events/audit, config/flags/secrets,
  metering, billing via Polar, notifications, webhooks, integrations, admin)
  with its own schema, contracts, and deny-by-default policy checks re-run
  inside the worker — the edge is a convenience, not the security boundary.
- **Shared packages.** `packages/contracts` (types + validators shared by
  edge/workers/SDK), `packages/db` (raw-SQL migrations + per-context
  repositories), `packages/sdk` and `packages/cli` (the public surface),
  `packages/policy-engine`, `packages/shared`.
- **Console.** `apps/web-console-next` — Next.js App Router deployed to
  Workers; URL-driven scope (`/orgs/{slug}/…`); talks only to the public API
  through the SDK, same as any customer.

## The marketplace on the baseline

ogpic is a fork of the reusable multi-tenant SaaS baseline: accounts,
organizations/teams, billing, notifications, webhooks, audit, and admin come
from the baseline contexts above. The photography-rental product (listings,
gear inventory, rental flows) builds on those rails — tenants are rental shops
and studios; plans/metering gate marketplace capability.

## Delivery — the repo is the desired state

There is no hand-run deploy. CI calls **`orun plan`** (compile intent →
deterministic plan) and **`orun run`** (execute via the pinned composition
stack); the orun provider is pinned in `kiox.yaml` and digest-locked in
`kiox.lock`. Root `intent.yaml` declares metadata, the `repo:`
self-description, discovery roots, trigger bindings, and the three
environments; every worker/package carries a `component.yaml` next to its code.
Infrastructure (Supabase project, Hyperdrive, KV, domains) is Terraform under
`infra/`, executed through the same plans.

**Environments:** `dev` → `stage` → `prod`, with prod promotion gated on
stage (`promotion.dependsOn: [stage]`) and approval required outside dev.
Custom domains (`ogpic.app`) are pending; current origins are the workers.dev
URLs listed in [`overview.md`](./overview.md).

**State & catalog:** on a clean default-branch build, the resolved catalog is
auto-pushed to Orun Cloud (`execution.state.autopushCatalog: true`, workspace
`ws_8D3ZJQM2`) — which is how this document reaches the platform's Docs surface
without any render-time call back into git.

## Where to change what

| You want to… | Touch |
|---|---|
| Add/adjust an API | the owning `apps/*-worker` + `packages/contracts` (+ SDK) |
| Change tenancy/roles | `membership-worker` + `policy-engine` facts |
| Add a schema change | `packages/db/src/migrations/NNN_*` (raw SQL, additive) |
| Change deploy behavior | `intent.yaml` / the component's `component.yaml` — never CI YAML |
| Add product docs like this one | `docs/*` + declare it in the manifest (`specs/epics/catalog-docs-adoption/`) |
