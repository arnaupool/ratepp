-- Asking group members for their score (docs/avisos.md).

-- "No la he probado": takes a group note out of that member's pending list
-- without scoring it.
CREATE TABLE IF NOT EXISTS score_dismissals (
  score_id uuid NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (score_id, user_id)
);

-- Web Push subscriptions, one per device where notifications were turned on.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
