# Test triage runbook

How to handle a failing or flaky verification suite anywhere in this repo —
one procedure, every `tests/*` component (this doc is attached to each suite;
content-addressed, so it is stored exactly once).

## Triage order

1. **Read the failure, not the retry button.** The suites are deterministic by
   design; a red run means the code, the contract, or the suite changed.
2. **Reproduce locally**: `pnpm --filter <suite> test` (suites run against
   in-memory fakes/executors — no cloud dependencies).
3. **Contract drift?** If a worker changed a wire shape, the fix is in
   `packages/contracts` + both sides — never a test-only patch that encodes
   the drift.
4. **New failure on an untouched suite** = a shared-package change rippled
   (contracts, db, testing, shared). Check the merge that preceded the red.

## Flake policy

There is no retry-until-green. A genuinely nondeterministic test is a bug in
the test: pin the seed/clock (suites use fixed NOW constants), or delete it.
Quarantining (skip + issue) is acceptable for at most one working day.

## Adding coverage

Every bug fix lands with the test that would have caught it, in the owning
suite. Suites mirror their target component one-to-one — if a new worker
ships, its suite ships in the same change.
