# Cloudflare Hyperdrive

`cloudflare-hyperdrive` provisions Cloudflare Hyperdrive, a pooled Postgres
connection layer that fronts the Supabase Postgres databases for ogpic's
Cloudflare Workers. It gives Workers fast, pooled access to the stage and prod
databases.

## Responsibilities
- Provision Cloudflare Hyperdrive resources for stage and prod.
- Point Hyperdrive origins at the Supabase Postgres connection.
- Provide pooled Postgres connectivity for the runtime Workers.

## Key dependencies
- `supabase` — provisions the Supabase Postgres origin and writes the connection
  secret to AWS Secrets Manager that Hyperdrive consumes.

## Delivery
Provisioned by Terraform through orun; plan on PRs, apply on merge to `main`,
for both stage and prod.
