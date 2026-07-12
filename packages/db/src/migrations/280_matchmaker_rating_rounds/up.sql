-- 280_matchmaker_rating_rounds
-- A rating round is the manager-gated voting window: while one is open, members
-- may rate each other; the aggregate vote drives each player's published score.
-- At most one open round per org (partial unique index). Additive and
-- idempotent; owned exclusively by apps/matchmaker-worker.

CREATE TABLE IF NOT EXISTS matchmaker.rating_rounds (
  id         UUID        NOT NULL PRIMARY KEY,
  org_id     UUID        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by  TEXT        NOT NULL,
  opened_at  TIMESTAMPTZ NOT NULL,
  closed_at  TIMESTAMPTZ
);

-- At most one open round per community.
CREATE UNIQUE INDEX IF NOT EXISTS matchmaker_rating_rounds_one_open_idx
  ON matchmaker.rating_rounds (org_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS matchmaker_rating_rounds_org_idx
  ON matchmaker.rating_rounds (org_id, opened_at DESC);
