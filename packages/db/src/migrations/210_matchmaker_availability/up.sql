-- 210_matchmaker_availability
-- Per-player availability for a community's next practice match. One row per
-- (org, player); the organizer toggles each player in / maybe / out and the
-- draft picks from the `in` set. Tenant-isolated by org_id; no cross-context
-- foreign keys (player_id references matchmaker.players by convention only, so a
-- released player's stale availability is simply ignored by reads). Owned
-- exclusively by apps/matchmaker-worker.

CREATE TABLE IF NOT EXISTS matchmaker.availability (
  org_id UUID NOT NULL,
  player_id UUID NOT NULL,
  state TEXT NOT NULL DEFAULT 'in' CHECK (state IN ('in', 'maybe', 'out')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, player_id)
);
