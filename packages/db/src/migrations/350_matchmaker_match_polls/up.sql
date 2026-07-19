-- 350_matchmaker_match_polls
-- The v5 match lifecycle starts with an availability poll: the manager posts
-- candidate times and turfs, players vote on all that work, the poll closes
-- (deadline or manually), the manager picks the winning slot and drafts teams.
-- Adds the pre-scheduled statuses plus poll/option/vote tables, per-match
-- dropouts (with a reason and manager resolution), and a small per-org
-- settings row (WhatsApp bridge toggle). Owned by the matchmaker context.

-- New pre-scheduled statuses: poll → finalizing → draft → scheduled…
ALTER TABLE matchmaker.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matchmaker.matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('poll', 'finalizing', 'draft', 'scheduled', 'live', 'played', 'cancelled'));

-- One poll per match.
CREATE TABLE IF NOT EXISTS matchmaker.match_polls (
  match_id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  deadline_kind TEXT NOT NULL DEFAULT '48h' CHECK (deadline_kind IN ('24h', '48h', 'manual')),
  deadline_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-close sweep: open polls whose deadline passed.
CREATE INDEX IF NOT EXISTS matchmaker_match_polls_due_idx
  ON matchmaker.match_polls (deadline_at)
  WHERE closed_at IS NULL AND deadline_at IS NOT NULL;

-- Candidate times ('time', with starts_at) and venues ('turf', with detail).
CREATE TABLE IF NOT EXISTS matchmaker.match_poll_options (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  org_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('time', 'turf')),
  label TEXT NOT NULL,
  detail TEXT,
  starts_at TIMESTAMPTZ,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matchmaker_match_poll_options_match_idx
  ON matchmaker.match_poll_options (match_id, kind, position);

-- A player's vote on one option; a player's ballot is the row set, replaced
-- atomically on re-vote.
CREATE TABLE IF NOT EXISTS matchmaker.match_poll_votes (
  option_id UUID NOT NULL,
  match_id UUID NOT NULL,
  org_id UUID NOT NULL,
  player_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (option_id, player_id)
);

CREATE INDEX IF NOT EXISTS matchmaker_match_poll_votes_match_idx
  ON matchmaker.match_poll_votes (match_id, player_id);

-- A confirmed player pulling out of a scheduled match, with a reason the
-- manager sees; resolved when the manager replaces them or adjusts teams.
CREATE TABLE IF NOT EXISTS matchmaker.match_dropouts (
  match_id UUID NOT NULL,
  org_id UUID NOT NULL,
  player_id UUID NOT NULL,
  reason TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS matchmaker_match_dropouts_open_idx
  ON matchmaker.match_dropouts (org_id, match_id)
  WHERE resolved_at IS NULL;

-- Squad-level toggles (today: the WhatsApp bridge).
CREATE TABLE IF NOT EXISTS matchmaker.org_settings (
  org_id UUID PRIMARY KEY,
  whatsapp_bridge BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
