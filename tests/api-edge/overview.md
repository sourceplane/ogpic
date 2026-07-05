# api-edge tests

The verification suite for **the edge's routing, facades, tenancy resolution, and header forwarding**. Runs in CI as a `quick-check` lane on
every plan (`pnpm --filter ./tests/api-edge test` locally) against in-memory
fakes — no cloud dependencies, deterministic by design.

Failing or flaky? Follow the shared
[test triage runbook](../../docs/testing/triage-runbook.md) — one procedure
for every suite in this repo.
