-- 300_matchmaker_player_phone
-- Adds an optional phone number to roster players so match notifications can
-- reach them over WhatsApp (alongside the contact email). Additive and
-- idempotent; owned exclusively by apps/matchmaker-worker.

ALTER TABLE matchmaker.players
  ADD COLUMN IF NOT EXISTS phone TEXT;
