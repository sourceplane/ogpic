# Terraform Bootstrap runbook

Operating **terraform bootstrap** — the foundation stack (accounts, state backends) everything else assumes.

## Blast radius

- Rarely applied; blast radius is the whole environment when it is.

## First response

1. Plan-only first, always. Read the diff line by line.
2. An unexpected destroy in the plan is a stop-the-line signal — reconcile state drift before applying.

## Known failure modes

- **State drift** — import the drifted resource; never `-target` around it.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../../../docs/runbook.md).
