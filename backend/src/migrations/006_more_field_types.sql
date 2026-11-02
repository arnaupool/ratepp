-- New dynamic field types: price, criteria (named sub-scores), duration,
-- link, boolean (sí/no), ingredients, steps and difficulty. Only the allowed
-- list changes; existing rows are untouched.
ALTER TABLE score_fields DROP CONSTRAINT IF EXISTS score_fields_type_check;
ALTER TABLE score_fields ADD CONSTRAINT score_fields_type_check CHECK (type IN (
  'text_long', 'number', 'date', 'location', 'photo', 'gallery', 'list', 'tag',
  'price', 'criteria', 'duration', 'link', 'boolean', 'ingredients', 'steps', 'difficulty'
));
