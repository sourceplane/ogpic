-- 220_matchmaker_captain
-- Adds the team captain designation to the roster. At most one active captain
-- per org (enforced by a partial unique index). Additive and idempotent; owned
-- exclusively by apps/matchmaker-worker.

ALTER TABLE matchmaker.players
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT false;

-- At most one captain per community.
CREATE UNIQUE INDEX IF NOT EXISTS matchmaker_players_one_captain_idx
  ON matchmaker.players (org_id)
  WHERE is_captain;
