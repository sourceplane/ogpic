# notifications-worker tests

The verification suite for **delivery, preferences, rules matching, and throttling**. Runs in CI as a `quick-check` lane on
every plan (`pnpm --filter ./tests/notifications-worker test` locally) against in-memory
fakes — no cloud dependencies, deterministic by design.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md) — one procedure
for every suite in this repo.
