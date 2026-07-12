-- 240_matchmaker_player_votes
-- Community skill voting on the roster. Each member may rate a teammate on the
-- position's named skills (1-5 stars); the published overall rating blends the
-- manager-authored baseline with the community average. One row per
-- (org, player, voter, skill); re-voting upserts. Additive and idempotent;
-- owned exclusively by apps/matchmaker-worker.

CREATE TABLE IF NOT EXISTS matchmaker.player_votes (
  org_id     UUID        NOT NULL,
  player_id  UUID        NOT NULL,
  voter_id   TEXT        NOT NULL,
  skill      TEXT        NOT NULL,
  stars      SMALLINT    NOT NULL CHECK (stars >= 1 AND stars <= 5),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (org_id, player_id, voter_id, skill)
);

-- Aggregate reads (per player, and roster-wide) scan by (org_id, player_id).
CREATE INDEX IF NOT EXISTS matchmaker_player_votes_player_idx
  ON matchmaker.player_votes (org_id, player_id);
