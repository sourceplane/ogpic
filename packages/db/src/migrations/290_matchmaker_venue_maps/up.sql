-- 290_matchmaker_venue_maps
-- Adds a Google Maps location (URL or lat,lng) to the practice-match venue, so a
-- manager can drop a pin players can tap to navigate. Additive and idempotent;
-- owned exclusively by apps/matchmaker-worker.

ALTER TABLE matchmaker.matches
  ADD COLUMN IF NOT EXISTS venue_maps_url TEXT;
