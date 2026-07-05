# config-worker tests

The verification suite for **settings, feature flags, and secret-manager metadata flows**. Runs in CI as a `quick-check` lane on
every plan (`pnpm --filter ./tests/config-worker test` locally) against in-memory
fakes — no cloud dependencies, deterministic by design.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md) — one procedure
for every suite in this repo.
