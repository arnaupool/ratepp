-- Site administration (docs/admin.md). Additive only.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
-- Bumped to sign the account out everywhere: tokens carry the version they
-- were issued with and older ones stop being accepted.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

-- Settings changed from the admin panel. A missing key means "use the
-- container's value".
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Deleting an account keeps its group notes in the group, without an author
-- (shown as "antiguo miembro"); its personal notes are deleted explicitly.
ALTER TABLE scores ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_owner_id_fkey;
ALTER TABLE scores ADD CONSTRAINT scores_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- A score made by an account that no longer exists.
ALTER TABLE score_ratings ADD COLUMN IF NOT EXISTS former_user boolean NOT NULL DEFAULT false;
