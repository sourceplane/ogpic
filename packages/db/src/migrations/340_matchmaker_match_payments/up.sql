-- 340_matchmaker_match_payments
-- A lightweight per-match payment ledger: has this player paid their share for
-- the pitch? One row per (org, match, player); the manager toggles `paid`.
-- Owned by the matchmaker context.

CREATE TABLE IF NOT EXISTS matchmaker.match_payments (
  org_id UUID NOT NULL,
  match_id UUID NOT NULL,
  player_id UUID NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, match_id, player_id)
);

-- List a match's payment rows tenant-scoped.
CREATE INDEX IF NOT EXISTS matchmaker_match_payments_match_idx
  ON matchmaker.match_payments (org_id, match_id);
