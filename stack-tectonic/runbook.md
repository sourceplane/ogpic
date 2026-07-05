# Stack Tectonic runbook

Operating **stack tectonic** — the repo-local composition stack (golden paths) every component builds/deploys through.

## Blast radius

- A composition change affects every component of that type on their next plan.
- Published to ghcr as an OCI stack; CI consumes the repo-local copy.

## First response

1. A "everything of type X fails the same way" signature = the composition, not the components.
2. Test composition changes against one component (dry-run lane) before merging.

## Known failure modes

- **Golden-path drift** — components overriding composition steps ad hoc is the smell; fix the path, not 14 copies.

## Rollback

Revert the offending commit on `main` and let CI converge — infrastructure
changes flow through the same plan/run lanes as code.

## Escalation

Owner: `platform`. See the [platform runbook](../docs/runbook.md).
