# saas-orun-secrets — Implementation status (as-built)

As-built record. Kept distinct from the design/plan docs; only shipped state
is recorded here.

## OS0 — Consume-contract smoke ✅ Shipped

- `tests/orun-secrets/` `turbo-package` quality component, subscribed to the
  `dev` `verify` profile so the suite runs in CI (install → pre-build test
  → build → typecheck), fully cloud-free.
- `tests/orun-secrets/orun-secret.manifest.json` declares the
  `secret://sourceplane/ogpic/dev/OGPIC_ORUN_SMOKE` reference, its scope,
  consumer, and `ORUN_SECRET_OGPIC_ORUN_SMOKE` local fallback. No value is
  committed.
- `src/secret-ref.ts` parses `secret://<workspace>/<project>/<env>/<KEY>[@version]`.
- `src/resolve.ts` implements the runtime consume precedence (injected KEY
  env → `ORUN_SECRET_<KEY>` fallback → fail closed) and a `redact()` helper.
- Tests (`src/resolve.test.ts`, `src/manifest.test.ts`) assert the reference
  shape, the manifest declares references only, the consume precedence,
  fail-closed behaviour on missing/empty values, and redaction discipline.

**What OS0 does not do:** it does not write to or read from a live
orun-cloud backend (blocked on G1/G2). The real value is written with
`orun secrets set` and injected by the runner at OS1+; OS0 proves the
ogpic-side consume contract against the local-fallback path.

## OS1–OS7

Not started. See `implementation-plan.md` and `risks-and-open-questions.md`.
