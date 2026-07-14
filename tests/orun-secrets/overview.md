# orun-secrets tests

The first task (OS0) of the [`saas-orun-secrets`](../../specs/epics/saas-orun-secrets/)
epic: a **cloud-free** proof that ogpic can declare an orun
`secret://` reference and consume it at runtime.

Runs in CI as the `dev` `verify` lane on every plan
(`pnpm --filter ./tests/orun-secrets test` locally) against in-memory
environments — no orun-cloud dependency, deterministic by design.

- `orun-secret.manifest.json` — the **declaration** ("secret written"): the
  typed `secret://sourceplane/ogpic/<env>/OGPIC_ORUN_SMOKE` reference for each
  of `dev`, `stage`, and `prod`, with its scope, consumer, and
  `ORUN_SECRET_<KEY>` local-fallback name. Values never become content — no
  value is committed here.
- `src/resolve.ts` — the **consumer**: resolves a `secret://` ref the way a
  component does at runtime (injected `KEY` env → `ORUN_SECRET_<KEY>` local
  fallback → fail closed), plus a `redact()` helper.

The key `OGPIC_ORUN_SMOKE` is provisioned in orun-cloud with a **separate
value per environment** (`orun secrets set --env dev|stage|prod`), injected at
run time by the orun runner. This suite proves the consume contract — including
that each environment resolves its own distinct value — against the
local-fallback path the runner uses when no backend is reachable.

- `tools/inspect.mjs` — a **live** orun-cloud inspector (`pnpm --filter
  ./tests/orun-secrets inspect`, needs `ORUN_TOKEN` + `ORUN_WORKSPACE`
  [+ `ORUN_PROJECT`]). It displays every secret across the workspace, project,
  and environments (names + metadata only, never values), and for `brokered`
  secrets follows the integration connection to report connection health and
  the external account — i.e. it tests the connection and pulls the account id
  via the orun API, without ever touching a raw provider token. It is a no-op
  in cloud-free lanes (no token), so it never breaks CI verify.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md).
