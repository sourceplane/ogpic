# Terraform Bootstrap

`bootstrap` proves the foundation that every other ogpic Terraform component
relies on: the S3 Terraform state backend and AWS Secrets Manager access. It
provisions no application resources — it exists to validate that state storage
and secret access work before the data-plane stacks run.

## Responsibilities
- Prove the S3 backend used for Terraform remote state.
- Prove AWS Secrets Manager access used by downstream stacks.
- Establish the baseline that later Terraform components depend on.

## Delivery
Provisioned by Terraform through orun; plan on PRs, apply on merge to `main`.
Runs across dev, stage, and prod environments.
