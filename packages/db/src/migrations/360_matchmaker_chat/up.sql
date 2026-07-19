-- 360_matchmaker_chat
-- Team chat: one squad-wide stream per org. Human messages ('text'), system
-- pills ('note'), and structural cards that reference a match ('poll',
-- 'sched') which the client renders as live poll / match-confirmed cards.
-- Reactions are a small emoji → subject-id-list map; author display name is
-- denormalized at write time so history survives roster changes. Owned by
-- the matchmaker context.

CREATE TABLE IF NOT EXISTS matchmaker.chat_messages (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'note', 'poll', 'sched')),
  body TEXT NOT NULL DEFAULT '',
  match_id UUID,
  author_player_id UUID,
  author_subject_id TEXT,
  author_name TEXT,
  reactions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feed pagination: newest first, tenant-scoped.
CREATE INDEX IF NOT EXISTS matchmaker_chat_messages_org_created_idx
  ON matchmaker.chat_messages (org_id, created_at DESC, id DESC);
