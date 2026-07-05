# Epic: catalog-docs-adoption

> **Reference-adopter half of a cross-repo epic.** The platform epic is
> **`sourceplane/orun-cloud`** `specs/epics/saas-catalog-docs/` (cluster **CD**;
> normative model in `model.md` there); the CLI half is **`sourceplane/orun`**
> `specs/orun-catalog-docs/`. This repo is the **worked example**: the first
> workspace whose catalog carries a real multi-doc set, exactly as it was the
> WO verification workspace (`entities/Repo/ogpic.json` was the proof artifact
> for `docs.overview`).

**What CD gives ogpic.** Today ogpic's `repo.docs.overview`
(`docs/overview.md`, declared in `intent.yaml`) renders as the workspace front
page on Orun Cloud — one document, on one entity. CD generalizes that spine so
**every catalog entity** (the `Repo`, each worker and package component, and
the derived Systems/Domains) can attach an ordered **doc set**
(`docs.pages`), carried in the catalog snapshot as content-addressed blobs and
browsable in the cloud console (Docs hub · reader · real entity Docs tabs).

## Status

| Field | Value |
|-------|-------|
| Status | **Draft — waiting on upstream.** Doc files pre-authored here (this PR); the manifest diff lands when the pinned orun provider carries CD1/CD2. |
| Blocked on | `orun` ≥ the first release with CD1 (`docs.pages` + universal walk) and CD2 (`catalog.entities` enrichment); this repo pins orun via `kiox.yaml` (`ghcr.io/sourceplane/orun`, currently `v2.21.0`) |
| Owner(s) | `intent.yaml`, `docs/*`, per-worker `component.yaml` docs blocks |
| Gate | Human-independent once the provider bump lands (a `kiox.yaml` version bump + manifest-only diff) |

**Do not declare `docs.pages` before the provider bump** — the pinned orun
validates unknown manifest fields, so an early declaration breaks `orun plan`
in CI. That is exactly why this epic pre-authors the *files* now and holds the
*manifest* diff for the bump.

## A0 — Pre-author the doc set (this PR)

Inert markdown; nothing reads it until declared:

- `docs/architecture.md` — how the platform is put together (bounded-context
  workers, api-edge facade, data plane, delivery via orun). Role:
  `architecture`.
- `docs/runbook.md` — operating ogpic: environments, deploy/rollback via orun,
  health checks, common failure modes. Role: `runbook`.

`docs/overview.md` (already live as the workspace front page) is untouched.

## A1 — Declare the repo doc set (on the provider bump)

Ready-to-paste `intent.yaml` diff (against the existing `repo:` block):

```yaml
repo:
  # …existing displayName/description/owner/links/tags…
  docs:
    overview: docs/overview.md            # unchanged
    pages:                                # NEW (orun ≥ CD1)
      - { path: docs/architecture.md, role: architecture, title: Architecture }
      - { path: docs/runbook.md, role: runbook, title: Operations runbook }
```

**Done when:** `orun plan` on a clean main attaches both pages
(`orun catalog docs repo:sourceplane/ogpic/ogpic` lists three attached docs
with commits), and the ogpic workspace on Orun Cloud shows them in the Docs
hub and the repo's docs card.

## A2 — Enrich one derived kind (proves CD2 end-to-end)

The components already project derived `Domain` entities that today carry a
bare name. Enrich the most load-bearing one:

```yaml
catalog:
  namespace: sourceplane                  # existing
  entities:                               # NEW (orun ≥ CD2)
    domain/identity:
      description: Sign-in, sessions, API keys, and OAuth for ogpic tenants.
      owner: platform
      docs:
        overview: docs/domains/identity.md   # authored with this milestone
```

**Done when:** the cloud's Domain page for `identity` renders the enriched
description + doc with provenance, and removing the enrichment returns the
Domain to its bare derived form (no phantom entity ever appears).

## A3 — Per-component docs (incremental, as content earns its place)

Workers with real operational surface area (api-edge, identity-worker,
billing-worker first) gain `spec.docs.pages` in their `component.yaml` pointing
at colocated `docs/` files. No bulk backfill — a page ships when someone writes
one worth reading; the CD empty states nudge the rest.

## Why ogpic goes first

The WO epic used this workspace to verify the single-doc spine end-to-end; CD
keeps that role. A fork-ready SaaS baseline whose own catalog is fully
documented *in the catalog* is also the best sales artifact the Docs hub can
have — the demo is the dogfood.
