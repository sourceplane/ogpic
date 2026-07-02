# Supabase Projects

`supabase` provisions the ogpic Supabase projects for the stage and prod
environments and stores their credentials in AWS Secrets Manager. It is the
source of the database connection details consumed by the rest of the data
plane.

## Responsibilities
- Provision the stage and prod Supabase projects.
- Write the resulting connection credentials to AWS Secrets Manager.
- Store Terraform state in S3.

## Key dependencies
- `bootstrap` — proves the S3 state backend and Secrets Manager access that this
  component writes to.

## Delivery
Provisioned by Terraform through orun; plan on PRs, apply on merge to `main`,
for both stage and prod.
