-- 370_matchmaker_rating_deadline_results
-- Rating Window v2 (docs/design/rondo-rating-window-spec.md): a rating round can
-- auto-close on a deadline (or stay manual), and closing settles each player's
-- score — recorded per round so managers and players can see the before→after
-- movement. Owned by the matchmaker context.

-- Deadline: when set, a cron sweep closes the round; 'manual' = manager closes.
ALTER TABLE matchmaker.rating_rounds
  ADD COLUMN IF NOT EXISTS deadline_kind TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS deadline_at   TIMESTAMPTZ;

ALTER TABLE matchmaker.rating_rounds DROP CONSTRAINT IF EXISTS rating_rounds_deadline_kind_check;
ALTER TABLE matchmaker.rating_rounds ADD CONSTRAINT rating_rounds_deadline_kind_check
  CHECK (deadline_kind IN ('24h', '48h', 'manual'));

-- Auto-close sweep: open rounds whose deadline has passed.
CREATE INDEX IF NOT EXISTS matchmaker_rating_rounds_due_idx
  ON matchmaker.rating_rounds (deadline_at)
  WHERE status = 'open' AND deadline_at IS NOT NULL;

-- One settled result row per rated player per round: the OVR movement the
-- window produced, plus how many teammate votes landed on them.
CREATE TABLE IF NOT EXISTS matchmaker.rating_round_results (
  round_id       UUID        NOT NULL,
  org_id         UUID        NOT NULL,
  player_id      UUID        NOT NULL,
  ovr_before     NUMERIC     NOT NULL,
  ovr_after      NUMERIC     NOT NULL,
  votes_received INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, player_id)
);

-- Fetch a round's results tenant-scoped (latest closed round drives analytics).
CREATE INDEX IF NOT EXISTS matchmaker_rating_round_results_org_round_idx
  ON matchmaker.rating_round_results (org_id, round_id);
