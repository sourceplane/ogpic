# Database Migration Harness

Database migration harness, manifest, and runner for the Ogpic platform. It
provides the tooling and structure used to define and apply schema changes to the
Supabase-backed data plane.

## Responsibilities
- Maintain the migration manifest that tracks ordered schema changes.
- Provide the runner that applies migrations.
- Offer a consistent harness for authoring and executing migrations.

## Delivery
Built and type-checked in the Turborepo; consumed by other components.
