-- 230_membership_join_requests
-- Join-by-code / request-to-join for organizations. A shareable, rotatable
-- join_code on the org lets a signed-in user request to join; a manager
-- (owner/admin) approves (creating a viewer membership) or declines. Additive
-- and idempotent; owned by the membership context.

-- Shareable code on the org (nullable; minted on first read/rotate).
ALTER TABLE membership.organizations
  ADD COLUMN IF NOT EXISTS join_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS membership_orgs_join_code_idx
  ON membership.organizations (join_code)
  WHERE join_code IS NOT NULL;

-- Pending/approved/declined requests to join, keyed by (org, subject). A
-- prospective member has at most one live request per org (partial unique index
-- on the pending state).
CREATE TABLE IF NOT EXISTS membership.join_requests (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  subject_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by TEXT
);

-- One live (pending) request per (org, subject).
CREATE UNIQUE INDEX IF NOT EXISTS membership_join_requests_one_pending_idx
  ON membership.join_requests (org_id, subject_id)
  WHERE status = 'pending';

-- Manager listing: newest first, tenant-scoped.
CREATE INDEX IF NOT EXISTS membership_join_requests_org_created_idx
  ON membership.join_requests (org_id, created_at DESC, id DESC);
