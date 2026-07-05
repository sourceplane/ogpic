# Config Worker runbook

On-call operations for **config worker** — settings, feature flags, and the secret manager (metadata + envelope-encrypted values).

## Service shape (what can break)

- Flag/setting reads on hot paths across contexts.
- Secret envelopes (AES-GCM ciphertexts) — write-only values, metadata reads.

## First response

1. A feature "randomly" off = check the flag's per-env value before the feature's worker.
2. Secret-dependent integrations failing after a rotation = the consumer cached the old value; redeploy the consumer.

## Known failure modes

- **Flag flips don't propagate** — flags are read live, not baked at deploy; a stale value means the caller reads the wrong scope (org vs env).
- **Never log secret values** — ciphertexts only; a plaintext secret in logs is an incident + rotation.

## Rollback

The repo is the desired state: revert the offending commit on `main` and let CI
converge (`orun plan --changed` → `orun run`). There is no hand rollback —
a manual `wrangler` deploy is drift the next plan will fight.

## Escalation

Owner: `platform`. Cross-cutting incidents (every context
failing at once) are almost never this worker — check the edge, Hyperdrive,
and Supabase first (see the [platform runbook](../../docs/runbook.md)).
