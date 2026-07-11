-- Replace the single cover_photo_url with an ordered gallery; the first
-- entry is the cover, and reordering the array changes the cover.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'cover_photo_url') THEN
    UPDATE scores SET photo_urls = ARRAY[cover_photo_url]
      WHERE cover_photo_url IS NOT NULL AND photo_urls = '{}';
  END IF;
END $$;

ALTER TABLE scores DROP COLUMN IF EXISTS cover_photo_url;
