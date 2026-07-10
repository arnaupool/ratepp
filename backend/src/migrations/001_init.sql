CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  cover_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scores_owner ON scores(owner_id);

CREATE TABLE IF NOT EXISTS score_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id uuid NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  is_owner boolean NOT NULL DEFAULT false,
  value integer NOT NULL CHECK (value BETWEEN 1 AND 10),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ratings_score ON score_ratings(score_id);

CREATE TABLE IF NOT EXISTS score_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id uuid NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('text_long','number','date','location','photo','gallery','list','tag')),
  label text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fields_score ON score_fields(score_id);
