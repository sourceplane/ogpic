# Rondo — Rating Window v2 spec

Extends the v5 ratings feature (`docs/design/rondo-v5-spec.md` §2 manager-10 /
player-8). Captures the requirements from the 2026-07-20 request. Implemented as
its own phase AFTER the in-flight claim/503 fix merges (shared files:
`use-rondo.ts`, `[orgSlug]/page.tsx`, `@saas/sdk`).

## Requirements

1. **Open to every player.** When a manager opens a rating window, every active
   member with a claimed player can rate. Each open window is an independent
   round; scores can be voted again in every new window.
2. **Rate each teammate per window.** In an open window a player rates all other
   active players, one at a time (6 skill segments → `Save & next`), cycling the
   full roster. Re-opening later starts a fresh round.
3. **Deadline or manual close.** When opening, the manager picks `24h` / `48h` /
   `manual` (mirrors the poll deadline UX). A dated window auto-closes via cron;
   `manual` closes when the manager taps *Close & settle*.
4. **Score changes + analytics, visible to manager AND players.** Closing a
   window settles votes into scores. Each player's OVR delta (before → after) is
   recorded per round and surfaced: the manager sees live rated-progress during
   the window and the settled per-player deltas after; each player sees their own
   change and the squad's.
5. **Player squad view.** Players get a read-only Squad screen — the full roster
   with position, tag, OVR, and a tap-through read-only player detail (attribute
   segments). No edit / add / invite affordances for players.

## Domain additions

### Migration 370_matchmaker_rating_deadline_results
- `matchmaker.rating_rounds` ADD `deadline_kind TEXT NOT NULL DEFAULT 'manual'
  CHECK (deadline_kind IN ('24h','48h','manual'))`, ADD `deadline_at TIMESTAMPTZ`.
  (partial index on `deadline_at WHERE closed_at IS NULL AND deadline_at IS NOT NULL`
  for the cron sweep.)
- `matchmaker.rating_round_results`: `round_id UUID`, `org_id UUID`,
  `player_id UUID`, `ovr_before NUMERIC NOT NULL`, `ovr_after NUMERIC NOT NULL`,
  `votes_received INT NOT NULL DEFAULT 0`, `created_at`, PK `(round_id, player_id)`.
  Written on close (one row per rated player). Index `(org_id, round_id)`.
- Registered in `packages/db/src/manifest.ts` (sha256) AND
  `infra/db-migrate/component.yaml` touched so the apply lane runs (standing
  caveat — migrations under `packages/db` don't select db-migrate).

## API (matchmaker)

- `POST /rating-round/open` (manager, existing) — body gains
  `{ deadline: '24h'|'48h'|'manual' }`; sets `deadline_at` from now; posts the
  existing chat note.
- `POST /rating-round/close` (manager or cron) — settle: for each active player
  compute `ovr_after = effectiveRating(round votes)`, read `ovr_before` from the
  pre-close rating, upsert `rating_round_results`, set `closed_at`; chat note.
- `GET /rating-round` (any member — already ungated) — returns
  `{ status, deadlineKind, deadlineAt, closedAt, ratedCount, eligible,
  results?: [{playerId, ovrBefore, ovrAfter, delta, votesReceived}] }` where
  `results` is the latest closed round's deltas.
- Cron `scheduled.ts` — `closeDueRatingRounds` mirrors `closeDuePolls`.
- Voting itself: existing `roster.castVotes` unchanged (per-skill), just usable
  by every claimed player while a window is open.

## SDK / VM

- SDK rating-round client: `open({deadline})`, `close()`, `get()` typed to the
  above; results array.
- `@saas/rondo-core`: rating round VM gains `deadlineKind/deadlineAt`, a
  `results` slice (per-player `{ovrBefore, ovrAfter, delta}`), and
  `openRound(deadline)` / `closeRound()` action signatures. `computePlayerStats`
  unaffected.

## UI (v5)

- **MRate**: deadline picker (24H/48H/MANUAL) on open; live `N/M rated`; after
  close, a RESULTS list — each player with OVR before → after and ▲/▼ delta chip
  (green up / rust down). Reuses SegmentBar-free result rows.
- **PRate**: unchanged rating flow, available to every claimed player while open;
  closed state shows the last round's summary (my delta + a "squad changes" link).
- **PSquad** (new, player): read-only Squad — search + position chips + rows
  (name, position, tag, OVR), tap → **PPlayerView** read-only detail (identity,
  OVR, 6 attribute segments read-only, "from teammate votes"). Player dock stays
  HOME · MATCHES · CHAT · RATE; PSquad is reached from a Home "View squad →"
  affordance and from PRate. (Dock has 4 slots per design; squad is a
  push-screen, not a 5th tab.)
- Analytics both sides: a compact "LAST WINDOW" panel (rounds settled, biggest
  mover) on manager Home and player Home, sourced from the results slice.

## Out of scope (this phase)
- Per-skill rating history graphs over time (only latest-round delta is stored).
- Weighting/decay of old votes beyond the existing `effectiveRating` blend.
