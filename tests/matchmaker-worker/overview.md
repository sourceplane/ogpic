# Matchmaker Worker Tests

Unit tests for `apps/matchmaker-worker`. Focus is the pure draft engine
(`src/engine/*`) — OVR computation, attribute/position rules, the balancing
algorithm, and share-text generation — exercised without a database. Handler
tests inject an in-memory repository and stub the membership/policy service
bindings, so the tenancy gate and validation paths run offline.

Run: `pnpm exec turbo run test --filter=@saas/matchmaker-worker-tests`.
