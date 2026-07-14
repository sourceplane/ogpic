-- 330_matchmaker_player_subject
-- Links a roster player to a signed-in account so that member can manage their
-- own availability (self-service RSVP). `subject_id` is the auth subject that
-- claimed the player; NULL means the player row is unclaimed (manager-managed).
-- At most one player per (org, subject) via a partial unique index. Owned by
-- the matchmaker context.

ALTER TABLE matchmaker.players
  ADD COLUMN IF NOT EXISTS subject_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS matchmaker_players_org_subject_idx
  ON matchmaker.players (org_id, subject_id)
  WHERE subject_id IS NOT NULL;
