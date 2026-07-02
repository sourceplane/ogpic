# Database Migrations

`db-migrate` applies database migrations to the ogpic stage and prod Supabase
Postgres instances. The migration files live in `packages/db/src/migrations`,
and this component runs them against each environment as part of the delivery
pipeline.

## Responsibilities
- Run pending database migrations against stage and prod Supabase databases.
- Plan migrations on pull requests and apply them on merge to `main`.
- Read the Supabase connection details from the AWS Secrets Manager secret
  (`sourceplane/ogpic/supabase`) written by the `supabase` component.

## Key dependencies
- `db` — the database package/schema whose migrations are executed.
- `supabase` — provisions the Supabase projects and writes the connection
  secret this component reads.

## Delivery
Runs through orun; plan on PRs, apply on merge to `main`, for both stage and
prod.
