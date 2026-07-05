# billing-worker tests

The verification suite for **the billing context: Polar adapter, subscriptions, entitlements**. Runs in CI as a `quick-check` lane on
every plan (`pnpm --filter ./tests/billing-worker test` locally) against in-memory
fakes — no cloud dependencies, deterministic by design.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md) — one procedure
for every suite in this repo.
