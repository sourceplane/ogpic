# saas-orun-secrets — Implementation plan

Milestones move in blast-radius order. Every milestone keeps AWS Secrets
Manager + `tooling/secrets-sync` running in parallel (dual-run) until its
"done when" is verified in stage **and** prod, so any cutover is reversible
by re-running the old sync. Stage precedes prod for every milestone.
`SECRET_ENCRYPTION_KEY` is carried byte-identical and never regenerated.

## OS0 — Consume-contract smoke ✅

**Scope.** A cloud-free proof that the orun-secrets write+consume contract
holds for ogpic, with no dependency on a live orun-cloud backend.

- `tests/orun-secrets/` — a `turbo-package` quality component subscribed to
  the `dev` `verify` profile, so its suite runs in CI (install → test →
  build → typecheck), all local.
- `tests/orun-secrets/orun-secret.manifest.json` — the **declaration**: a
  typed `secret://sourceplane/ogpic/dev/OGPIC_ORUN_SMOKE` reference, its
  scope, its consumer, and the `ORUN_SECRET_<KEY>` local-fallback name. No
  value is committed (the values-never-become-content invariant).
- `src/secret-ref.ts` + `src/resolve.ts` — the consumer: a `secret://`
  parser and a `resolveSecret()` that mirrors the runner precedence
  (injected `KEY` env → `ORUN_SECRET_<KEY>` local fallback → fail closed),
  plus a `redact()` helper.

**Done when.** CI is green: the manifest parses and declares only a
reference; `resolveSecret` returns the injected value, falls back to the
local override, prefers the injected value, fails closed when neither is
present or the value is empty; and `redact` never emits the raw value.

## OS1 — Foundations (blocked on orun-cloud tenancy)

**Scope.** Provision the orun-cloud tenant for ogpic: workspace + project +
`dev`/`stage`/`prod` environments mirroring `intent.yaml`; a service
principal (`sk_`) or CI-OIDC → workflow token with `secret.read/write/
value.use` + materialize; a `SecretPolicy` (prod protected/deny-by-default,
`SECRET_ENCRYPTION_KEY` locked non-overridable + no-rotate-without-escrow);
confirm secrets are created as `v:2` per-workspace DEK envelopes; add an
orun-secrets drift check to CI mirroring `tooling/secrets-sync/check.mjs`.

**Done when.** `orun secrets set/list` round-trips against the ogpic
workspace; the single bootstrap credential is the only new GitHub secret;
the drift check runs in a verify lane.

## OS2 — Cloudflare

**Scope.** (a) `SECRET_ENCRYPTION_KEY` (config/webhooks/integrations
workers): `orun secrets import` the exact escrow value, add composition
`secretBindings` so SEC6 materializes it into the workers at deploy.
(b) `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`: store in orun, inject
as env into the wrangler-deploy and cloudflare Terraform `orun run` jobs;
remove from GitHub Actions secrets.

**Done when.** Workers boot and decrypt with the orun-materialized key
(byte-identical), CF deploys succeed with injected creds, and the CF secrets
no longer flow through `secrets-sync` in stage+prod.

## OS3 — Supabase

**Scope.** (a) `SUPABASE_API_KEY`/`SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_ID`
injected into the supabase Terraform job. (b) TF-generated
`database_password`/`connection_uri`: the supabase apply job writes them back
into orun via `orun secrets set` in a post-apply step (SEC5 workaround);
`cloudflare-hyperdrive` TF and `infra/db-migrate` switch from the AWS SM
`secretName` to an orun secret ref + injection.

**Done when.** Migrations run and Hyperdrive provisions from the
orun-sourced connection in stage+prod; no Supabase secret is read from AWS SM.

## OS4 — Integrations + platform secrets

**Scope.** Provider by provider, `orun secrets import` from the existing
`integrations/*` + `platform-secrets/*` documents, preserving the
`integrations.manifest.json` worker→secret mapping as composition
`secretBindings`: Polar → billing-worker; GitHub/Google OAuth +
`OAUTH_STATE_SECRET` → identity-worker; deferred `INTEGRATIONS_STATE_SECRET`
+ GitHub-App bundle → integrations-worker (created up front). Replace the
`assemble.mjs`/`sync.mjs` push with SEC6 materialization. Paired non-secret
config stays as wrangler `vars`.

**Done when.** Every runtime worker secret materializes from orun in
stage+prod and the `secrets-sync` push path is unused for them.

## OS5 — Config & resource-ID wiring

**Scope.** Resource-ID wiring (`hyperdrive_id`, `kv_id`) are Terraform
outputs, not secrets — leave `tooling/wire/render.mjs` + `@@wiring@@` tokens
untouched until orun **SEC5 (inter-job outputs)** lands, then replace the
tokens with an orun outputs hand-off. `NEXT_PUBLIC_*` remain build-time vars
(they ship to the browser and can never be secrets).

**Done when.** SEC5 is available and resource IDs flow through orun outputs,
or this milestone is explicitly deferred with the tokens documented as the
interim mechanism.

## OS6 — Decommission

**Scope.** After a soak period green in stage+prod: delete
`tooling/secrets-sync` (assemble/sync/check) and `tests/secrets-sync`;
remove AWS SM `integrations/*`, `platform-secrets/*`, `worker-secrets/*`
(retain `supabase/*` only while still TF-consumed pending SEC5); drop all
GitHub Actions secrets except the orun bootstrap credential; update
`specs/core/access-and-infra.md` to name orun the system of record.

**Done when.** No secret flows through AWS Secrets Manager for runtime
workers and the `saas-secrets-sync` epic is closed/superseded.

## OS7 — Hardening

**Scope.** Confirm orun-cloud KEK custody moved to Cloudflare Secrets Store
(SS4) with key escrow/DR; port `check.mjs` drift semantics to the orun
`secret_syncs` provenance; author rotation + break-glass + disaster-recovery
runbooks with parity to today's `seed.md`.

**Done when.** A documented DR drill re-hydrates a fresh Cloudflare account
from orun, and rotation is exercised end to end.
