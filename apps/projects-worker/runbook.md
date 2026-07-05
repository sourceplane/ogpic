# Projects Worker runbook

On-call operations for **projects worker** — projects (repos) and environments — the unit orun state, runs, and catalog heads hang off.

## Service shape (what can break)

- Project/environment CRUD; the `project == repo` binding consumed by the state plane.
- Postgres projects schema.

## First response

1. Repo lists empty or projects missing: check this worker before blaming the console.
2. `wrangler tail projects-worker`.
3. If orun pushes fail with project-scope errors, verify the workspace link (`orun cloud link`) rather than the project rows.

## Known failure modes

- **Rename lifecycle** — project renames propagate by id, not slug; stale slugs in bookmarks 404 (expected).
- **Environment drift** — environments here are metadata; the deploy-time truth is the intent file.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
