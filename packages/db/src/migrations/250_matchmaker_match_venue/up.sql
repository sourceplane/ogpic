-- 250_matchmaker_match_venue
-- Adds the practice-match venue to fixtures: a human name ("Astro Park"), an
-- optional address, and a booked flag so a manager can either record an
-- already-booked pitch or mark one as secured. Additive and idempotent; owned
-- exclusively by apps/matchmaker-worker.

ALTER TABLE matchmaker.matches
  ADD COLUMN IF NOT EXISTS venue_name    TEXT,
  ADD COLUMN IF NOT EXISTS venue_address TEXT,
  ADD COLUMN IF NOT EXISTS venue_booked  BOOLEAN NOT NULL DEFAULT false;
