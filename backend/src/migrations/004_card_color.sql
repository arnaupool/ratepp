-- Optional custom card background color, either manually picked by the user
-- or suggested from the cover photo's average color. NULL means "no custom
-- color set" and the client falls back to its category-hash tint.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS card_color text;
