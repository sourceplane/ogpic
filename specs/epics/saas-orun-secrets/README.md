# Epic: saas-orun-secrets

**One secret store, owned by orun.** Migrate every ogpic secret and
environment-specific config value off AWS Secrets Manager and onto **orun
secrets** — typed `secret://<workspace>/<project>/<env>/<KEY>` references
resolved at deploy time (materialized into the Cloudflare Worker secret
store) or injected at run time (lease-bound resolve), never fetched by a
worker at request time. Sequenced Cloudflare → Supabase → integrations, then
`tooling/secrets-sync` and the redundant Secrets Manager documents retire.

This is the **adopter half** of a cross-repo program: it consumes
`orun`'s `orun-secrets` (SEC0–SEC7) CLI/runner and `orun-cloud`'s
`saas-secret-manager` (SM1–SM6) backend. It is distinct from — and
eventually supersedes — [`saas-secrets-sync`](../saas-secrets-sync/), which
keeps AWS Secrets Manager as the system of record.

## Status

| Field | Value |
|-------|-------|
| Status | **Draft (OS0 shipped; OS1 blocked on orun-cloud tenancy)** |
| Cluster | **OS** (OS0–OS7) |
| Owner(s) | `tests/orun-secrets/` (new), `stack-tectonic` worker compositions, all `wrangler.template.jsonc` surfaces, `infra/terraform/*`, `tooling/secrets-sync/` (retired at OS6), `specs/core/access-and-infra.md` |
| Target branch | `main` |
| Builds on | `saas-secrets-sync` SS0–SS6 (escrow model, manifest, drift check), BF5/BF6 wiring rails; upstream `orun` SEC0–SEC7 and `orun-cloud` SM1–SM6 |
| Decisions locked | Secret **values never become content** (refs only); workers never read secrets at request time; delivery is deploy-time materialization or run-time injection; AWS Secrets Manager remains the fallback of record until OS6 verifies parity |
| End-state target | Every ogpic secret authored/rotated in orun; Cloudflare hydrated by orun materialization; CI provider creds injected at run time; GitHub Actions holds only the single orun bootstrap credential; `secrets-sync` deleted |

## Thesis

ogpic already stores every secret in AWS Secrets Manager and mirrors it —
write-only — into Cloudflare Worker secrets at deploy time via
`tooling/secrets-sync` (`saas-secrets-sync`). Workers never read secrets at
request time; they read Cloudflare's `env` binding populated at deploy. That
is *exactly* the model orun secrets was built around, which makes ogpic the
natural first adopter:

- orun's **only** materialization adapter that exists today is
  `cloudflare-worker` (SEC6) — and ogpic is a Cloudflare Workers app, so the
  one adapter that ships is the one ogpic needs.
- ogpic's CI runs **only** `orun plan` / `orun run`, so provider/deploy
  credentials can be delivered by run-time env injection (SEC3) instead of
  GitHub Actions secrets.
- orun-cloud has **no** "long-lived service fetches a secret by API key"
  path — the biggest gap for a generic client — but ogpic *forbids*
  request-time secret reads by spec, so that gap does not block it.

The migration therefore reuses orun's rails rather than inventing new ones,
and moves in blast-radius order: prove the consume contract cloud-free
(OS0), stand up tenancy + auth + policy (OS1), then Cloudflare (OS2),
Supabase (OS3), integrations (OS4), config/wiring (OS5), decommission
`secrets-sync` (OS6), and harden (OS7).

Anti-goals (inherited from `saas-secrets-sync`): workers never fetch a
secret store at request time; secret values never appear in Terraform plans,
CI logs, job summaries, `plan.json`, or this spec tree.

## Read order

1. `README.md` (this file).
2. `implementation-plan.md` — OS0–OS7 with scope and "done when".
3. `risks-and-open-questions.md` — the readiness gap register (G1–G10).
4. `IMPLEMENTATION-STATUS.md` — as-built record.

## Milestones at a glance

| ID | Milestone | Human help? | Status |
|----|-----------|-------------|--------|
| OS0 | Consume-contract smoke: `tests/orun-secrets` component + declared `secret://` ref, cloud-free proof of write+consume, precedence, fail-closed, redaction | No | ✅ Shipped (this PR) |
| OS1 | Foundations: orun-cloud tenant (workspace/project/dev·stage·prod), service-principal / CI-OIDC auth, `SecretPolicy`, v:2 envelopes, orun drift check | **Yes — provision tenant + auth** | ⛔ Blocked (G1, G2) |
| OS2 | Cloudflare: `SECRET_ENCRYPTION_KEY` via SEC6 materialization; `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` via run-time injection | Deploy approvals | 🗓️ Planned (after OS1) |
| OS3 | Supabase: `SUPABASE_API_KEY`/`SUPABASE_ORG_ID` injected; TF-generated `database_password`/`connection_uri` written back via in-job `orun secrets set` (SEC5 workaround) | No | 🗓️ Planned (G3, G4) |
| OS4 | Integrations + platform secrets (Polar, GitHub/Google OAuth, `OAUTH_STATE_SECRET`, deferred GitHub-App bundle) via `orun secrets import` + SEC6 | **Yes — re-key values** | 🗓️ Planned |
| OS5 | Config & resource-ID wiring hand-off (hyperdrive/kv IDs) once SEC5 lands; `NEXT_PUBLIC_*` stay build-time vars | No | 🗓️ Planned (G3) |
| OS6 | Decommission `tooling/secrets-sync`, redundant Secrets Manager docs, and all GitHub secrets except the orun bootstrap credential | No | 🗓️ Planned |
| OS7 | Hardening: KEK custody (orun-cloud SS4), rotation/DR runbook parity, drift reconciliation | No | 🗓️ Planned (G5, G6, G8) |
