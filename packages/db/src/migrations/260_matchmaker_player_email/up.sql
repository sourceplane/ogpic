-- 260_matchmaker_player_email
-- Adds an optional contact email to roster players so a manager can reach them
-- for match RSVPs (the groundwork for availability-request emails). Additive
-- and idempotent; owned exclusively by apps/matchmaker-worker.

ALTER TABLE matchmaker.players
  ADD COLUMN IF NOT EXISTS email TEXT;
