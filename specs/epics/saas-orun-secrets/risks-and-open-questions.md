# saas-orun-secrets — Risks & open questions

The readiness gap register for consuming orun secrets from ogpic. Severity
is relative to *this* repo (a Cloudflare-Workers app that deploys via
`orun run`), not a generic client. Each gap names the owning repo and the
milestone it blocks.

## Blocking gaps

| # | Gap | Owner | Blocks |
|---|-----|-------|--------|
| G1 | **orun-cloud production availability** for ogpic's workspace — the resolve/materialize endpoints must be live and reachable, or `orun run` with `secret://` refs fails closed (404). | orun-cloud | OS1, all |
| G2 | **ogpic service-principal / CI-OIDC auth** not yet provisioned — needs `secret.value.use` + materialize grants; the bootstrap credential is the one irreducible GitHub secret. | orun-cloud + ogpic | OS1 |
| G3 | **SEC5 (inter-job outputs) not merged** in `orun` or `orun-cloud` — no clean hand-off of Terraform-generated secrets or resource IDs. OS3 uses an in-job `orun secrets set` workaround; OS5 is hard-blocked. | orun + orun-cloud | OS3 (workaround), OS5 |
| G4 | **db-migrate consumption change** — `infra/db-migrate` reads the AWS SM `secretName` directly today; it must switch to orun injection. | ogpic | OS3 |

## Hardening gaps (before orun is the sole system of record)

| # | Gap | Impact |
|---|-----|--------|
| G5 | **KEK custody is interim** — orun-cloud `SECRET_KEK` is a plain Worker secret binding; move to Cloudflare Secrets Store (SS4) + key escrow/DR before orun holds the only copy of `SECRET_ENCRYPTION_KEY` (which ogpic must never regenerate). | High for OS6/OS7 |
| G6 | **Drift-reconciliation parity** — ogpic relies on `check.mjs` (escrow vs CF live). Confirm orun `secret_syncs` (SM5) gives an equivalent "CF live in sync with orun source of truth" check, or port `check.mjs`. | Medium |
| G7 | **`v:1` static-key envelopes still exist** in orun-cloud; ensure ogpic secrets are created as `v:2` per-workspace DEK. | Medium (OS1 gate) |
| G8 | **Epic docs upstream are stale/"Draft"** with no as-built status — rotation/break-glass/DR runbooks may lag the shipped code; validate against merged PRs, not READMEs. | Medium |
| G9 | **Materialization adapters are Cloudflare-only** — AWS SSM / GitHub-repo-secret adapters are deferred upstream. Fine for ogpic (run-time injection covers CI creds), but CI secrets cannot be *materialized into* GitHub Actions secrets — they are injected per-run instead. | Low for ogpic |
| G10 | **Team-scoped Layer-2 policy** is evaluated with an empty team set on the resolve path upstream. ogpic is solo/M0 today, so low impact — revisit if multi-team access rules are needed. | Low |

## Non-gaps (worth stating)

- **No runtime fetch API** upstream is *not* a gap for ogpic — its
  no-request-time-reads rule aligns with orun's deploy-time model.
- **CLI maturity** — the `orun secrets` operator surface (set/import/list/
  rotate/revoke/versions/reveal) and `orun policy` are merged and complete.

## Open questions

1. Does the ogpic workspace get a dedicated orun-cloud tenant, or share the
   `oruncloud` control-plane workspace referenced in `intent.yaml`?
2. Is the SEC5 workaround (in-job `orun secrets set` for TF-generated
   values) acceptable long-term, or do we hold OS3's DB-credential leg until
   SEC5 lands?
3. Should non-secret environment config (OAuth client IDs, Polar product
   map) move to an orun config surface, or stay as committed wrangler
   `vars`? Current recommendation: stay as `vars`.
