# API Edge architecture

How the single public entry point is put together, and why the platform keeps
exactly one.

## The facade chain

Every request classifies against a regex route table and dispatches to a
per-context **facade** (`src/*-facade.ts`) that proxies to the owning worker
over a Cloudflare **service binding**. The edge:

1. resolves tenancy in the path (`ws_…`/slug/`org_…` all normalize to
   `/v1/organizations/{id}/…`),
2. applies rate-limit families per route family (the coordination hot path
   rides a higher family than run-create),
3. forwards a fixed header allowlist (`orun-contract-version`,
   `idempotency-key`, trace headers) — nothing else crosses the boundary.

The edge is a convenience, **not** the security boundary: every owning worker
re-runs deny-by-default policy on arrival. A bug here can misroute, but it
cannot grant.

## Why one entry point

- One TLS/route surface to defend, rate-limit, and observe.
- Workers stay private (service-binding only) — no lateral public surface.
- Contract-version skew is enforced in exactly one place.

## Failure isolation

A facade failure takes out one context's routes; the health endpoint and the
other facades keep serving. The [runbook](runbook.md) starts from that
property: one context down → the worker; all down → edge, auth, or database.
