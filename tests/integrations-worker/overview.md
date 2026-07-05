# integrations-worker tests

The verification suite for **GitHub App installs, repo links, and inbound webhook verification**. Runs in CI as a `quick-check` lane on
every plan (`pnpm --filter ./tests/integrations-worker test` locally) against in-memory
fakes — no cloud dependencies, deterministic by design.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md) — one procedure
for every suite in this repo.
