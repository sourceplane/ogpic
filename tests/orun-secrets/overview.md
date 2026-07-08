# orun-secrets tests

The first task (OS0) of the [`saas-orun-secrets`](../../specs/epics/saas-orun-secrets/)
epic: a **cloud-free** proof that ogpic can declare an orun
`secret://` reference and consume it at runtime.

Runs in CI as the `dev` `verify` lane on every plan
(`pnpm --filter ./tests/orun-secrets test` locally) against in-memory
environments — no orun-cloud dependency, deterministic by design.

- `orun-secret.manifest.json` — the **declaration** ("secret written"): a
  typed `secret://sourceplane/ogpic/dev/OGPIC_ORUN_SMOKE` reference with its
  scope, consumer, and `ORUN_SECRET_<KEY>` local-fallback name. Values never
  become content — no value is committed here.
- `src/resolve.ts` — the **consumer**: resolves a `secret://` ref the way a
  component does at runtime (injected `KEY` env → `ORUN_SECRET_<KEY>` local
  fallback → fail closed), plus a `redact()` helper.

The live write (`orun secrets set`) and lease-bound resolve are gated on the
orun-cloud tenant (OS1); this suite proves the consume contract against the
local-fallback path that the runner uses when no backend is reachable.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md).
