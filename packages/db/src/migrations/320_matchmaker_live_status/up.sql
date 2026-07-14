-- 320_matchmaker_live_status
-- Widens the fixtures status CHECK to allow 'live' — a match that has kicked
-- off (manually by the manager, or auto-started at its scheduled time by the
-- matchmaker cron) before it is finalised to 'played'. Idempotent
-- (drop-if-exists then re-add); owned by the matchmaker context.

ALTER TABLE matchmaker.matches
  DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matchmaker.matches
  ADD CONSTRAINT matches_status_check
    CHECK (status IN ('scheduled', 'live', 'played', 'cancelled'));
