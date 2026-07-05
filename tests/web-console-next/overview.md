# web-console-next tests

The verification suite for **the console's view-models, codecs, and lib logic**. Runs in CI as a `quick-check` lane on
every plan (`pnpm --filter ./tests/web-console-next test` locally) against in-memory
fakes — no cloud dependencies, deterministic by design.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md) — one procedure
for every suite in this repo.
