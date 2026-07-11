-- 200_matchmaker_core
-- Matchmaker product persistence foundation — the shared roster (players) and
-- fixtures (matches) for the matchmaker bounded context. Tenant-isolated by
-- org_id; no cross-context foreign keys (org_id is an opaque UUID owned by the
-- membership context). Owned exclusively by apps/matchmaker-worker.

CREATE SCHEMA IF NOT EXISTS matchmaker;

-- ── Roster ──────────────────────────────────────────────────────
-- One row per player in a community's shared pool. `rating` is the computed
-- OVR (1–99), always re-derived server-side from `attributes` on write, so a
-- forged rating is impossible. `attributes` holds the six named stat keys
-- (outfield {PAC,SHO,PAS,DRI,DEF,PHY} or GK {DIV,HAN,KIC,REF,SPD,POS}).
CREATE TABLE IF NOT EXISTS matchmaker.players (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD', 'ALL')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 99),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- Keyset pagination + tenant isolation for the active roster listing.
CREATE INDEX IF NOT EXISTS matchmaker_players_org_active_idx
  ON matchmaker.players (org_id, created_at DESC, id DESC)
  WHERE status = 'active';

-- ── Fixtures ────────────────────────────────────────────────────
-- One row per scheduled match. `team_a`/`team_b` are IMMUTABLE lineup snapshots
-- captured at draft time ({id,name,position,rating} per player) — editing or
-- deleting a player later must not rewrite fixture history, so teams are stored
-- as JSONB and never joined back to matchmaker.players. `share_token` backs the
-- server-generated share payload (and a future public read link).
CREATE TABLE IF NOT EXISTS matchmaker.matches (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'played', 'cancelled')),
  format TEXT,
  team_a JSONB NOT NULL,
  team_b JSONB NOT NULL,
  rating_a NUMERIC NOT NULL DEFAULT 0,
  rating_b NUMERIC NOT NULL DEFAULT 0,
  score_a INTEGER CHECK (score_a IS NULL OR score_a >= 0),
  score_b INTEGER CHECK (score_b IS NULL OR score_b >= 0),
  share_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fixtures list: most recent kickoff first, tenant-scoped.
CREATE INDEX IF NOT EXISTS matchmaker_matches_org_scheduled_idx
  ON matchmaker.matches (org_id, scheduled_at DESC, id DESC);

-- Share token is globally unique (it is an opaque capability identifier).
CREATE UNIQUE INDEX IF NOT EXISTS matchmaker_matches_share_token_idx
  ON matchmaker.matches (share_token);
