-- Multi-category support: replace the single `category` column with an array.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'category') THEN
    UPDATE scores SET categories = ARRAY[category] WHERE category IS NOT NULL AND categories = '{}';
  END IF;
END $$;

ALTER TABLE scores DROP COLUMN IF EXISTS category;
CREATE INDEX IF NOT EXISTS idx_scores_categories ON scores USING GIN (categories);
