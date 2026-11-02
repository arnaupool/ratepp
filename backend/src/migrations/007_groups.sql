-- Groups: shared spaces whose members see, create and score each other's
-- notes (docs/grupos.md). Additive only: every existing note stays personal.

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- Invitation links: only a hash of the random token is stored.
CREATE TABLE IF NOT EXISTS group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_invites_group ON group_invites(group_id);

-- NULL = personal note. owner_id keeps meaning "author".
ALTER TABLE scores ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_scores_group ON scores(group_id);

-- A rating made by a user with an account (the author's own, or another
-- member's in a group note). NULL for the free-named "Nota adicional" ones.
ALTER TABLE score_ratings ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
UPDATE score_ratings sr SET user_id = s.owner_id
FROM scores s
WHERE sr.score_id = s.id AND sr.is_owner AND sr.user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_score_ratings_user ON score_ratings(score_id, user_id) WHERE user_id IS NOT NULL;
