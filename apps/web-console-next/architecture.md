# Web Console architecture

The customer-facing console: Next.js App Router deployed to Cloudflare Workers
with static assets, rendering every product surface (Overview, Catalog, Docs,
Activities, Repos, Settings).

## A thin client, on purpose

The console talks ONLY to the public API through the shared SDK — the same
surface customers script against. There is no privileged backend path: if the
console can do it, the API can, and RBAC/rate-limits/audit apply identically.

- **URL-driven scope**: `/orgs/{slug}/…` carries the workspace; deep links are
  first-class (catalog entities, doc reader routes are stable identities).
- **Client caches**: one React Query cache entry per org-wide read (catalog
  graph, doc index, runs feed) shared across surfaces — the Docs hub and the
  scorecard read the same doc-index fetch.
- **Git-authored content**: catalog descriptions, entity docs, and this very
  page render from content-addressed blobs pushed by `orun plan` — the console
  renders what git produced and never authors it.

## Failure isolation

A console outage never implies an API outage (SDK/CLI keep working) — and the
[runbook](runbook.md) triages in exactly that order.
